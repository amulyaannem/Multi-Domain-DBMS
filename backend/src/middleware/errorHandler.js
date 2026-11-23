function errorHandler(error, req, res, next) {
    console.error(error);

    if (error.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "A conflicting record already exists",
        });
    }

    if (error.code === "23503") {
        return res.status(409).json({
            success: false,
            message: "This record is referenced by other records",
        });
    }

    if (error.code === "23514" || error.code === "22P02") {
        return res.status(400).json({
            success: false,
            message: "Invalid data supplied",
        });
    }

    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
    });   
}

module.exports = errorHandler;