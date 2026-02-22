class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Wrap async route handlers to avoid try/catch boilerplate
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Standard API response helpers
const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  res.status(statusCode).json({
    status: "success",
    ...meta,
    data,
  });
};

const sendPaginated = (res, data, total, page, limit) => {
  res.status(200).json({
    status: "success",
    results: data.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    data,
  });
};

module.exports = { AppError, catchAsync, sendSuccess, sendPaginated };
