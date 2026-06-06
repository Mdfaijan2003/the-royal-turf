const validate = schema => {
  return (req, res, next) => {
    const body = schema.parse(req.body);
    req.body = body;
    next();
  };
};

export default validate;
