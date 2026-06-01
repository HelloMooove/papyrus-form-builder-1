import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
  showCounter?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, hint, id, showCounter = true, maxLength, ...props }, ref) => {
    const inputId = id || props.name;
    const currentLength = typeof props.value === 'string' || typeof props.value === 'number' 
      ? String(props.value).length 
      : 0;

    const showCharCounter = showCounter && maxLength !== undefined && maxLength > 0;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xl text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          maxLength={maxLength}
          className={cn(
            'h-14 w-full rounded-md border bg-bg-surface px-5 text-xl text-text-primary',
            'placeholder:text-text-tertiary',
            'transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-cta/20',
            error ? 'border-danger' : 'border-border-strong',
            className
          )}
          {...props}
        />
        {(hint || error || showCharCounter) && (
          <div className="flex items-start justify-between gap-2 text-lg">
            <div className="flex-1">
              {error ? (
                <p className="text-danger font-medium">{error}</p>
              ) : (
                hint && <p className="text-text-tertiary">{hint}</p>
              )}
            </div>
            {showCharCounter && (
              <span
                className={cn(
                  'shrink-0 text-text-tertiary font-mono select-none text-base',
                  currentLength > maxLength * 0.8 && 'text-red-500 font-semibold'
                )}
              >
                {currentLength} / {maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

