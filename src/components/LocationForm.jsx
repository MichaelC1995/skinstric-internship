import React from 'react';

const LocationForm = ({ onSubmit, error, isSubmitting, cityInputRef, isLocationFilled, setIsLocationFilled, register }) => (
    <form
        onSubmit={onSubmit}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-opacity duration-300 opacity-100 animate-fade-in"
        aria-label="Enter your city"
        disabled={isSubmitting}
    >
        <div className="flex flex-col items-center opacity-100 max-w-[420px]">
            {isSubmitting ? (
                <>
                    <p className="text-[12px] sm:text-sm font-semibold text-center">Processing Submission</p>
                    <div className="flex space-x-2 mt-2">
                        <span className="text-xl sm:text-2xl font-bold animate-dot-bounce-1">.</span>
                        <span className="text-xl sm:text-2xl font-bold animate-dot-bounce-2 delay-100">.</span>
                        <span className="text-xl sm:text-2xl font-bold animate-dot-bounce-3 delay-200">.</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="relative h-4 sm:h-5 mb-2 w-full text-center">
                        <p
                            id="location-instruction"
                            className={`absolute left-0 right-0 text-center text-[16px] text-gray-400 tracking-wider uppercase pointer-events-none transition-opacity duration-700 ${
                                isLocationFilled ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                            WHERE ARE YOU FROM?
                        </p>
                        <p
                            id="click-to-type"
                            className={`absolute left-0 right-0 text-center text-[16px]  text-gray-400 tracking-wider uppercase pointer-events-none transition-opacity duration-700 ${
                                isLocationFilled ? 'opacity-0' : 'opacity-100'
                            }`}
                        >
                            CLICK TO TYPE
                        </p>
                    </div>
                    <input
                        ref={cityInputRef}
                        className="text-5xl font-normal text-center bg-transparent border-b border-black focus:outline-none appearance-none w-[110vw] max-w-[448px] min-w-[300px] pt-1  tracking-[-0.05em] leading-[50px] sm:leading-[64px] text-[#1A1B1C] placeholder:text-black placeholder:opacity-100"
                        placeholder="Where are you from?"
                        autoComplete="off"
                        type="text"
                        name="location"
                        {...register('location', {
                            required: 'City cannot be empty.',
                            pattern: {
                                value: /^[a-zA-Z\s'-]+$/,
                                message: 'City can only contain letters, spaces, hyphens, or apostrophes.',
                            },
                            onChange: (e) => setIsLocationFilled(e.target.value.trim().length > 0),
                        })}
                        disabled={isSubmitting}
                        aria-describedby="location-instruction click-to-type"
                    />
                    {error && <p className="text-red-500 text-[10px] sm:text-xs mt-2" role="alert">{error}</p>}
                </>
            )}
        </div>
    </form>
);

export default LocationForm;