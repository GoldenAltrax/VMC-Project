// Form Validation Utilities for VMC Planner

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: unknown, formData?: Record<string, unknown>) => string | null;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single field against rules
 */
export function validateField(
  value: unknown,
  rules: ValidationRule,
  formData?: Record<string, unknown>
): string | null {
  // Required check
  if (rules.required) {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const strValue = String(value);

  // Min length
  if (rules.minLength !== undefined && strValue.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  // Max length
  if (rules.maxLength !== undefined && strValue.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  // Min value (for numbers)
  if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
    return `Must be at least ${rules.min}`;
  }

  // Max value (for numbers)
  if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
    return `Must be no more than ${rules.max}`;
  }

  // Pattern
  if (rules.pattern && !rules.pattern.test(strValue)) {
    return rules.patternMessage || 'Invalid format';
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value, formData);
  }

  return null;
}

/**
 * Validate an entire form against a schema
 */
export function validateForm(
  data: Record<string, unknown>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(data[field], rules, data);
    if (error) {
      errors[field] = error;
      valid = false;
    }
  }

  return { valid, errors };
}

// ============================================
// Pre-built Validators
// ============================================

export const validators = {
  /**
   * Check if value is not empty
   */
  required: (value: unknown): string | null => {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
    return null;
  },

  /**
   * Validate email format
   */
  email: (value: unknown): string | null => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(value))) {
      return 'Invalid email address';
    }
    return null;
  },

  /**
   * Validate phone number format (flexible)
   */
  phone: (value: unknown): string | null => {
    if (!value) return null;
    const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
    if (!phoneRegex.test(String(value))) {
      return 'Invalid phone number';
    }
    return null;
  },

  /**
   * Validate date string
   */
  date: (value: unknown): string | null => {
    if (!value) return null;
    const date = new Date(String(value));
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return null;
  },

  /**
   * Validate that number is positive
   */
  positiveNumber: (value: unknown): string | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      return 'Must be a positive number';
    }
    return null;
  },

  /**
   * Validate that end date is after start date
   */
  dateRange: (startDate: unknown, endDate: unknown): string | null => {
    if (!startDate || !endDate) return null;
    const start = new Date(String(startDate));
    const end = new Date(String(endDate));
    if (start > end) {
      return 'End date must be after start date';
    }
    return null;
  },

  /**
   * Validate password strength
   */
  password: (value: unknown): string | null => {
    if (!value) return null;
    const strValue = String(value);
    if (strValue.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  },

  /**
   * Validate password confirmation matches
   */
  passwordMatch: (password: unknown, confirmPassword: unknown): string | null => {
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  },

  /**
   * Validate URL format
   */
  url: (value: unknown): string | null => {
    if (!value) return null;
    try {
      new URL(String(value));
      return null;
    } catch {
      return 'Invalid URL';
    }
  },

  /**
   * Validate that value is one of allowed options
   */
  oneOf: (allowedValues: string[]) => (value: unknown): string | null => {
    if (!value) return null;
    if (!allowedValues.includes(String(value))) {
      return `Must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  },

  /**
   * Validate time format (HH:MM)
   */
  time: (value: unknown): string | null => {
    if (!value) return null;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(String(value))) {
      return 'Invalid time format (use HH:MM)';
    }
    return null;
  },

  /**
   * Validate time range (start before end)
   */
  timeRange: (startTime: unknown, endTime: unknown): string | null => {
    if (!startTime || !endTime) return null;
    const start = String(startTime);
    const end = String(endTime);
    if (start >= end) {
      return 'End time must be after start time';
    }
    return null;
  },
};

// ============================================
// Pre-built Validation Schemas
// ============================================

export const schemas = {
  machine: {
    name: { required: true, minLength: 2, maxLength: 100 },
    model: { required: true, minLength: 2, maxLength: 100 },
    serial_number: { maxLength: 50 },
    status: {
      required: true,
      custom: validators.oneOf(['active', 'idle', 'maintenance', 'error']),
    },
    capacity: {
      custom: validators.oneOf(['Small', 'Medium', 'Large', 'Extra Large']),
    },
  } as ValidationSchema,

  project: {
    name: { required: true, minLength: 2, maxLength: 200 },
    planned_hours: { required: true, min: 0 },
    status: {
      required: true,
      custom: validators.oneOf(['planning', 'active', 'completed', 'on-hold']),
    },
  } as ValidationSchema,

  schedule: {
    machine_id: { required: true },
    date: { required: true, custom: validators.date },
    planned_hours: { required: true, min: 0 },
    start_time: { custom: validators.time },
    end_time: { custom: validators.time },
  } as ValidationSchema,

  maintenance: {
    machine_id: { required: true },
    date: { required: true, custom: validators.date },
    maintenance_type: {
      required: true,
      custom: validators.oneOf(['preventive', 'corrective', 'inspection', 'calibration']),
    },
    status: {
      custom: validators.oneOf(['scheduled', 'in-progress', 'completed', 'cancelled']),
    },
    cost: { min: 0 },
  } as ValidationSchema,

  user: {
    username: { required: true, minLength: 3, maxLength: 50 },
    email: { custom: validators.email },
    full_name: { maxLength: 100 },
    role: {
      required: true,
      custom: validators.oneOf(['Admin', 'Operator', 'Viewer']),
    },
  } as ValidationSchema,

  client: {
    name: { required: true, minLength: 2, maxLength: 200 },
    contact_email: { custom: validators.email },
    contact_phone: { custom: validators.phone },
  } as ValidationSchema,

  changePassword: {
    current_password: { required: true },
    new_password: { required: true, minLength: 6 },
    confirm_password: { required: true },
  } as ValidationSchema,
};

// ============================================
// Utility Functions
// ============================================

/**
 * Create a validation schema with custom rules
 */
export function createSchema(rules: ValidationSchema): ValidationSchema {
  return rules;
}

/**
 * Merge multiple schemas
 */
export function mergeSchemas(...schemas: ValidationSchema[]): ValidationSchema {
  return Object.assign({}, ...schemas);
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get first error message from errors object
 */
export function getFirstError(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
}
