//Creating a custom error handling type
class ApiError extends Error {
  constructor(
    statusCode,
    message = "something went wrong",
    errors = [],
    stack = ""
  ) {
    //super key is used to call constructor of Error class(parent) and initilized
    super(message);
    (this.message = message),
      (this.statusCode = statusCode),
      (this.errors = errors),
      (this.success = false),
      (this.data = null);

    //to track if any data is missing in stack
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
