import React, { useState, useEffect } from "react";
import { Input } from "./input";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { validators, formatters } from "../utils/validators";

export default function ValidatedInput({
  type = "text",
  validationType,
  value,
  onChange,
  onValidationChange,
  className = "",
  required = false,
  ...props
}) {
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!validationType || !touched || !value) {
      setError(null);
      setIsValid(false);
      return;
    }

    const validator = validators[validationType];
    if (!validator) {
      console.warn(`No validator found for type: ${validationType}`);
      return;
    }

    const result = validator(value);
    setError(result.error || null);
    setIsValid(result.valid);
    
    if (onValidationChange) {
      onValidationChange(result.valid);
    }
  }, [value, validationType, touched]);

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Aplicar formateador si existe
    if (validationType && formatters[validationType]) {
      newValue = formatters[validationType](newValue);
    }
    
    onChange({ ...e, target: { ...e.target, value: newValue } });
  };

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div className="relative">
      <Input
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`pr-10 ${error ? 'border-red-500 focus:ring-red-500' : isValid && touched ? 'border-green-500 focus:ring-green-500' : ''} ${className}`}
        required={required}
        {...props}
      />
      
      {touched && value && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {error ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : isValid ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : null}
        </div>
      )}
      
      {error && touched && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}