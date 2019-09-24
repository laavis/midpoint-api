import * as Validator from 'validator';
import isEmpty from './isEmpty';

interface IErrors {
  [key: string]: any;
}

function validateLoginInput(data: any) {
  const errors: IErrors = {};

  // Data to string
  data.email = !isEmpty(data.email) ? data.email : '';
  data.password = !isEmpty(data.password) ? data.password : '';

  if (!Validator.isEmail(data.email)) {
    errors.email = 'Email is invalid';
  }

  if (Validator.isEmpty(data.email)) {
    errors.email = 'Email field is required';
  }

  if (Validator.isEmpty(data.password)) {
    errors.password = 'Password field is required';
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
}

export default validateLoginInput;
