import * as React from 'react';

import { cn } from '@/lib/utils';

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-md border border-[#FFD700]/30 bg-[#0a0a0a] px-3 py-2 text-sm text-[#FFD700] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/30 focus-visible:ring-offset-2 focus-visible:border-[#FFD700]/50 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%23FFD700\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3e%3c/svg%3e")] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10 cursor-pointer hover:border-[#FFD700]/40 transition-all',
          className
        )}
        style={{
          backgroundColor: '#0a0a0a',
          color: '#FFD700',
        }}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
NativeSelect.displayName = 'NativeSelect';

export interface NativeSelectOptionProps
  extends React.OptionHTMLAttributes<HTMLOptionElement> {}

const NativeSelectOption = React.forwardRef<
  HTMLOptionElement,
  NativeSelectOptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <option
      className={cn('bg-[#0a0a0a] text-[#FFD700]', className)}
      style={{
        backgroundColor: '#0a0a0a',
        color: '#FFD700',
      }}
      ref={ref}
      {...props}
    >
      {children}
    </option>
  );
});
NativeSelectOption.displayName = 'NativeSelectOption';

export interface NativeSelectOptGroupProps
  extends React.OptgroupHTMLAttributes<HTMLOptGroupElement> {}

const NativeSelectOptGroup = React.forwardRef<
  HTMLOptGroupElement,
  NativeSelectOptGroupProps
>(({ className, children, ...props }, ref) => {
  return (
    <optgroup
      className={cn('text-[#f2f2f1]', className)}
      ref={ref}
      {...props}
    >
      {children}
    </optgroup>
  );
});
NativeSelectOptGroup.displayName = 'NativeSelectOptGroup';

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup };
