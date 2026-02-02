/**
 * 404 Not Found Handler
 */

export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route niet gevonden: ${req.method} ${req.originalUrl}`
    }
  });
};
