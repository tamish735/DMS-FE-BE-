const simpleAuth = (req, res, next) => {
  const key = req.query.key;

  if (key !== "123") {
    return res.status(401).json({
      message: "Unauthorized: key missing or invalid"
    });
  }

  // allow request to continue
  next();
};

module.exports = simpleAuth;