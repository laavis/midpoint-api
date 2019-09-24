import * as Validator from 'validator';
import isEmpty from './isEmpty';

interface IErrors {
  [key: string]: any;
}

function validateRegisterInput(data: any) {
  const errors: IErrors = {};

  // Data to string
  data.username = !isEmpty(data.username) ? data.username : '';
  data.email = !isEmpty(data.email) ? data.email : '';
  data.password = !isEmpty(data.password) ? data.password : '';
  data.confirm_password = !isEmpty(data.confirm_password) ? data.confirm_password : '';

  if (!Validator.isLength(data.username, { min: 2, max: 64 })) {
    errors.name = 'Username must be between 2 and 64 characters';
  }

  if (Validator.isEmpty(data.username)) {
    errors.name = 'Username field is required';
  }

  if (Validator.isEmpty(data.email)) {
    errors.email = 'Email field is required';
  }

  if (!Validator.isEmail(data.email)) {
    errors.email = 'Email is invalid';
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = 'Password field is required';
  }

  if (!Validator.isLength(data.password, { min: 6, max: 64 })) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (Validator.isEmpty(data.confirm_password)) {
    errors.confirmPassword = 'Confirm Password field is required';
  }

  if (!Validator.equals(data.password, data.confirm_password)) {
    errors.confirmPassword = 'Passwords must match';
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
}

export default validateRegisterInput;
