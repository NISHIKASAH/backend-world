const asyncHandler = (resultHandler) => {
  //(req,res,next) is express middleware for handling asynchronous call
  return (req, res, next) => {
    Promise.resolve(resultHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
//----OR----

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(err.code || 500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
