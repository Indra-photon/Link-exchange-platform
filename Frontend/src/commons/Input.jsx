import React from 'react';

function Input({ 
  type = 'text', 
  variant = 'default', 
  size = 'md', 
  error = false,
  className = '',
  ...props 
}) {
  const baseClasses = 'w-full border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-lg',
  };

  const variantClasses = {
    default: 'border-gray-300 focus:border-blue-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
  };

  const finalVariant = error ? 'error' : variant;
  const finalClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[finalVariant]} ${className}`;

  return <input type={type} className={finalClasses} {...props} />;
}

export default Input;