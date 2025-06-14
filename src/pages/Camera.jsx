import React, { useState, useEffect, useRef } from 'react';
import { FaCamera, FaPlay } from 'react-icons/fa';
import { MdRadioButtonUnchecked } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../context/CameraContext';

const Camera = () => {
    const { isCameraViewActive, setIsCameraViewActive, navbarText, setNavbarText } = useCamera();
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [showCameraLoading, setShowCameraLoading] = useState(false);
    const [showCameraView, setShowCameraView] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [analysisData, setAnalysisData] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    useEffect(() => {
        setIsCameraViewActive(true);

        const urlParams = new URLSearchParams(window.location.search);
        const isGalleryMode = urlParams.get('mode') === 'gallery' || sessionStorage.getItem('pendingGalleryUpload') === 'true';

        if (isGalleryMode) {
            sessionStorage.removeItem('pendingGalleryUpload');
            if (!fileInputRef.current) {
                console.error('fileInputRef.current is missing');
                setError('File input not found. Please try again.');
                navigate('/result');
                return;
            }
            setTimeout(() => {
                fileInputRef.current.click();
            }, 100);
        } else {
            initializeCamera();
        }

        return () => {
            setIsCameraViewActive(false);
            setNavbarText('');
            cleanupCamera();
        };
    }, [setIsCameraViewActive, setNavbarText]);

    useEffect(() => {
        if (showCameraView && stream && videoRef.current) {
            videoRef.current.srcObject = stream;

            const handleLoadedMetadata = () => {
                videoRef.current.play()
                    .catch(err => {
                        if (err.name !== 'AbortError') {
                            console.error('Video play error:', err);
                            setError(`Failed to play video: ${err.message}`);
                        }
                    });
            };

            videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
            return () => {
                if (videoRef.current) {
                    videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                }
            };
        } else if (showCameraView && stream && !videoRef.current) {
            console.error('Video element not found');
            setError('Video element not found. Please try again.');
        }
    }, [showCameraView, stream]);

    const cleanupCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const initializeCamera = async () => {
        setShowCameraLoading(true);
        setError(null);

        try {
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: isMobile ? 1920 : 1280 },
                    height: { ideal: isMobile ? 1080 : 720 }
                },
                audio: false
            };

            const [mediaStream] = await Promise.all([
                navigator.mediaDevices.getUserMedia(constraints),
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
            setStream(mediaStream);
            setShowCameraLoading(false);
            setShowCameraView(true);
        } catch (err) {
            console.error('Camera initialization failed:', err);
            setShowCameraLoading(false);
            if (err.name === 'NotAllowedError') {
                setError('Camera access denied. Please allow camera access and try again.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found. Please connect a camera.');
            } else if (err.name === 'NotSupportedError') {
                setError('Camera not supported by this browser.');
            } else {
                setError(`Failed to access camera: ${err.message}`);
            }
        }
    };

    const handleGalleryUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            navigate('/result');
            return;
        }

        if (!file.type.startsWith('image/')) {
            console.error('Invalid file type:', file.type);
            setError('Please select a valid image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            console.error('File size exceeds 10MB:', file.size);
            setError('File size exceeds 10MB. Please select a smaller image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Image = e.target.result;
            if (!base64Image || base64Image === 'data:,' || base64Image.length < 100) {
                console.error('Invalid image data from FileReader');
                setError('Invalid image data. Please select a valid image.');
                return;
            }
            setCapturedImage(base64Image);
            setShowCameraView(false);
            setShowCameraLoading(false);
            setShowPreview(true);
            setNavbarText('ANALYSIS');
            cleanupCamera();
        };
        reader.onerror = () => {
            console.error('FileReader error');
            setError('Failed to read the selected image. Please try again.');
        };
        reader.readAsDataURL(file);

        if (event.target) {
            event.target.value = '';
        }
    };

    const handleCameraCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.error('Camera feed not loaded, video dimensions:', video.videoWidth, video.videoHeight);
                setError('Camera feed not loaded. Please try again.');
                return;
            }

            requestAnimationFrame(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64Image = canvas.toDataURL('image/jpeg', 0.95);

                if (!base64Image || base64Image === 'data:,' || base64Image.length < 100) {
                    console.error('Invalid image captured');
                    setError('Failed to capture valid image. Please try again.');
                    return;
                }

                if (stream) {
                    stream.getTracks().forEach(track => track.enabled = false);
                }

                setCapturedImage(base64Image);
                setShowCameraView(false);
                setShowPreview(true);
                setNavbarText('ANALYSIS');
            });
        } else {
            console.error('Video or canvas ref missing:', { videoRef: !!videoRef.current, canvasRef: !!canvasRef.current });
            setError('Failed to capture image. Please try again.');
        }
    };

    const uploadImage = async (base64String) => {
        setIsUploading(true);
        setError(null);

        try {
            if (!base64String || typeof base64String !== 'string') {
                console.error('Invalid base64String:', base64String);
                throw new Error('Please take or select a picture first.');
            }
            if (!base64String.startsWith('data:image/')) {
                console.error('Not a valid image data URL');
                throw new Error('Invalid image data: not a valid image data URL');
            }
            const base64Data = base64String.split(',')[1];
            if (!base64Data || base64Data.length < 100) {
                console.error('Base64 content too small:', base64Data?.length);
                throw new Error('Invalid image data: base64 content too small');
            }

            const response = await fetch('https://us-central1-api-skinstric-ai.cloudfunctions.net/skinstricPhaseTwo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ image: base64String }),
            });

            const responseText = await response.text();

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse API response:', parseError, 'responseText:', responseText.substring(0, 100));
                throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`);
            }

            if (response.status !== 200 && response.status !== 201) {
                console.error('API request failed, status:', response.status, 'message:', result.message || result.error);
                throw new Error(`Upload failed with status ${response.status}: ${result.message || result.error || 'Unknown error'}`);
            }

            if (result.error || result.message === 'No analysis data available') {
                console.error('API returned error:', result.error || result.message);
                throw new Error(result.error || result.message || 'Analysis failed');
            }

            if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
                console.error('No analysis data received');
                throw new Error('No analysis data received from server');
            }

            const analysisData = result.data || result.analysis || result.results || result;
            setAnalysisData(analysisData);

            try {
                sessionStorage.setItem('analysisData', JSON.stringify(analysisData));
                sessionStorage.setItem('analysisTimestamp', Date.now().toString());

                const testRead = sessionStorage.getItem('analysisData');
                if (!testRead) {
                    console.error('Failed to verify sessionStorage write');
                    throw new Error('Failed to verify sessionStorage write');
                }
            } catch (storageError) {
                console.error('Failed to store analysis data in sessionStorage:', storageError);
            }

            setNavbarText('ANALYSIS');
            navigate('/select', {
                state: {
                    analysisData: analysisData,
                    timestamp: Date.now(),
                    debug: 'Camera navigation successful',
                    source: showCameraView ? 'camera' : 'gallery'
                }
            });
        } catch (err) {
            console.error('uploadImage error:', err.message);
            setError(`Failed to upload image: ${err.message}`);
            setShowPreview(true);
        } finally {
            setIsUploading(false);
        }
    };

    const handleProceed = () => {
        if (!capturedImage || typeof capturedImage !== 'string' || !capturedImage.startsWith('data:image/')) {
            console.error('Invalid capturedImage, cannot proceed');
            setError('Please take or select a picture first.');
            return;
        }
        setShowPreview(false);
        setNavbarText('ANALYSIS');
        uploadImage(capturedImage);
    };

    const handleGoBack = () => {
        cleanupCamera();
        setShowCameraView(false);
        setShowPreview(false);
        setShowCameraLoading(false);
        setNavbarText('');
        navigate('/result');
    };

    const handleRetry = () => {
        setError(null);
        initializeCamera();
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                style={{ display: 'none' }}
            />

            {(showCameraView || showCameraLoading || error) && !isUploading && !showPreview && (
                <div className="fixed inset-0 bg-black z-10 overflow-hidden">
                    {showCameraView && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover z-[15]"
                            style={{ display: 'block', transform: 'scaleX(-1)' }}
                            onError={(e) => {
                                console.error('Video element error:', e);
                                setError('Video element error occurred.');
                            }}
                        />
                    )}

                    <div
                        className={`absolute z-30 flex items-center ${
                            isMobile ? 'bottom-[11.2%] left-4' : 'bottom-10 left-10'
                        }`}
                    >
                        <button
                            onClick={handleGoBack}
                            aria-label="Back"
                            className="relative w-12 h-12 flex items-center justify-center border border-white rotate-45 hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                        >
                            {isMobile ? (
                                <span className="text-white font-semibold text-[12.6px] rotate-[-45deg]">BACK</span>
                            ) : (
                                <FaPlay className="rotate-[135deg] scale-[1.2] text-white" />
                            )}
                        </button>
                        {!isMobile && (
                            <span className="text-white font-semibold text-sm ml-6">BACK</span>
                        )}
                    </div>

                    {showCameraView && (
                        <div
                            className={`absolute z-20 flex gap-3 items-center ${
                                isMobile
                                    ? 'bottom-[10%] left-1/2 transform -translate-x-1/2 flex-col'
                                    : 'right-4 top-1/2 -translate-y-1/2'
                            }`}
                        >
                            {!isMobile && (
                                <span className="text-white font-semibold ml-6 text-sm">
                                    TAKE A PICTURE
                                </span>
                            )}
                            <button
                                onClick={handleCameraCapture}
                                className="w-16 h-16 bg-white rounded-full border-4 border-gray-200 hover:scale-110 flex items-center justify-center"
                            >
                                <FaCamera className="w-8 h-8 text-black" />
                            </button>
                        </div>
                    )}

                    <div
                        className={`absolute z-20 px-4 ${
                            isMobile ? 'bottom-0 w-full' : 'bottom-10 w-full'
                        }`}
                    >
                        <div className="text-center space-y-5 max-w-4xl mx-auto">
                            <p
                                className={`text-white font-medium ${
                                    isMobile ? 'text-[10.8px]' : 'text-xs md:text-sm'
                                }`}
                            >
                                TO GET BETTER RESULTS MAKE SURE TO HAVE
                            </p>
                            <div
                                className={`flex flex-row items-center justify-center space-x-2 sm:space-x-4 md:space-x-12 text-white flex-nowrap ${
                                    isMobile ? 'text-[10.8px]' : 'text-xs md:text-sm'
                                }`}
                            >
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">NEUTRAL EXPRESSION</span>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">FRONTAL POSE</span>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">ADEQUATE LIGHTING</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            )}

            {showCameraLoading && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4">
                    <div className="absolute inset-0 z-40">
                        {[70, 55, 40].map((size, i) => (
                            <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div
                                    className={`absolute border-dotted border-2 border-black opacity-${5 + i * 5} rotate-45 animate-spin-${
                                        ['slowest', 'slower', 'slow'][i]
                                    }`}
                                    style={{
                                        width: `${size}vw`,
                                        height: `${size}vw`,
                                        maxWidth: `${300 - i * 30}px`,
                                        maxHeight: `${300 - i * 30}px`,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                        <img
                            src="/camera.jpg"
                            alt="Camera Icon"
                            className="w-20 h-20 md:w-24 md:h-24 object-contain"
                        />
                    </div>

                    <div
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-12 z-50`}
                    >
                        <h2
                            className={`font-semibold text-black tracking-wide text-center ${
                                isMobile ? 'text-[12.6px]' : 'text-sm'
                            }`}
                        >
                            <div className="flex justify-center items-center">
                                SETTING UP CAMERA
                                <span className="animate-dot-bounce-1"> .</span>
                                <span className="animate-dot-bounce-2">.</span>
                                <span className="animate-dot-bounce-3">.</span>
                            </div>
                        </h2>
                    </div>

                    <div
                        className={`absolute z-20 px-4 ${
                            isMobile ? 'bottom-0 w-full' : 'bottom-10 w-full'
                        }`}
                    >
                        <div className="text-center space-y-4 max-w-4xl mx-auto">
                            <p
                                className={`font-medium text-gray-600 ${
                                    isMobile ? 'text-[10.8px]' : 'text-xs md:text-sm'
                                }`}
                            >
                                TO GET BETTER RESULTS MAKE SURE TO HAVE
                            </p>
                            <div
                                className={`flex flex-row items-center justify-center space-x-2 sm:space-x-4 md:space-x-8 text-black flex-nowrap ${
                                    isMobile ? 'text-[10.8px]' : 'text-xs md:text-sm'
                                }`}
                            >
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">NEUTRAL EXPRESSION</span>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">FRONTAL POSE</span>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">ADEQUATE LIGHTING</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPreview && !isUploading && !error && (
                <div className="fixed inset-0 bg-black z-10 overflow-hidden">
                    <img
                        src={capturedImage}
                        alt="Captured Photo"
                        className="w-full h-full object-cover z-[15]"
                    />

                    <div
                        className={`absolute z-30 flex items-center ${
                            isMobile ? 'bottom-[11.2%] left-4' : 'bottom-10 left-10'
                        }`}
                    >
                        <button
                            onClick={handleGoBack}
                            aria-label="Back"
                            className="relative w-12 h-12 flex items-center justify-center border border-white rotate-45 hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                        >
                            {isMobile ? (
                                <span className="text-white font-semibold text-[12.6px] rotate-[-45deg]">BACK</span>
                            ) : (
                                <FaPlay className="rotate-[135deg] scale-[1.2] text-white" />
                            )}
                        </button>
                        {!isMobile && (
                            <span className="text-white font-semibold text-sm ml-6">BACK</span>
                        )}
                    </div>

                    <div
                        className={`absolute z-20 px-4 ${
                            isMobile ? 'bottom-0 w-full' : 'bottom-10 w-full'
                        }`}
                    >
                        <div className="text-center space-y-5 max-w-4xl mx-auto">
                            <p
                                className={`text-white font-medium ${
                                    isMobile ? 'text-[10.8px]' : 'text-xs md:text-sm'
                                }`}
                            >
                                TO GET BETTER RESULTS MAKE SURE TO HAVE
                            </p>
                            <div
                                className={`flex flex-row items-center justify-center space-x-2 sm:space-x-4 md:space-x-12 text-white flex-nowrap ${
                                    isMobile ? 'text-[10.8px]' : 'text-xs md:text-sm'
                                }`}
                            >
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">NEUTRAL EXPRESSION</span>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">FRONTAL POSE</span>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <MdRadioButtonUnchecked className="flex-shrink-0" />
                                    <span className="font-medium whitespace-nowrap">ADEQUATE LIGHTING</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`absolute z-30 flex items-center ${
                            isMobile ? 'bottom-[11.2%] right-4' : 'bottom-10 right-10'
                        }`}
                    >
                        {!isMobile && (
                            <span className="text-white font-semibold text-sm mr-6">PROCEED</span>
                        )}
                        <button
                            onClick={handleProceed}
                            aria-label="Proceed"
                            className="relative w-12 h-12 flex items-center justify-center border border-white rotate-45 hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                        >
                            {isMobile ? (
                                <span className="text-white font-semibold text-[12.6px] rotate-[-45deg]">PROCEED</span>
                            ) : (
                                <FaPlay className="rotate-[-45deg] scale-[1.2] text-white" />
                            )}
                        </button>
                    </div>

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                        <p
                            className={`text-white animate-fadeInOut ${
                                isMobile ? 'text-[18px]' : 'text-xl'
                            }`}
                        >
                            GREAT SHOT!
                        </p>
                    </div>
                </div>
            )}

            {isUploading && (
                <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
                    {[70, 55, 40].map((size, i) => (
                        <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                                className={`absolute border-dotted border-2 border-black opacity-${5 + i * 5} rotate-45 animate-spin-${
                                    ['slowest', 'slower', 'slow'][i]
                                }`}
                                style={{
                                    width: `${size}vw`,
                                    height: `${size}vw`,
                                    maxWidth: `${300 - i * 30}px`,
                                    maxHeight: `${300 - i * 30}px`,
                                }}
                            />
                        </div>
                    ))}
                    <div className="absolute inset-20 flex flex-col items-center justify-center z-20">
                        <p className="text-[16px] font-semibold text-center">Preparing your analysis</p>
                        <div className="flex justify-center items-center mt-2">
                            <span className="text-3xl font-bold animate-dot-bounce-1">.</span>
                            <span className="text-3xl font-bold animate-dot-bounce-2">.</span>
                            <span className="text-3xl font-bold animate-dot-bounce-3">.</span>
                        </div>
                    </div>
                </div>
            )}

            {error && !showCameraLoading && !isUploading && !showPreview && (
                <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 px-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Camera Error</h2>
                        <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={handleRetry}
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={handleGoBack}
                                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:scale-105 transition-transform"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Camera;