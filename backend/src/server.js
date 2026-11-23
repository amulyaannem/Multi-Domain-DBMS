require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/businessRoutes"); 
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const errorHandler = require("./middleware/errorHandler");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const pool = require("./config/db");

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL,
}));

app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
    res.json({
        message: "Business Management System API",
        status: "running",
    });
});

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "healthy",
            database: "connected",
        });
    } catch (error) {
        res.status(500).json({
            status: "unhealthy",
            database: "disconnected",
        });
    }
});

const PORT = process.env.PORT || 5000;
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/businesses/:businessId/products",productRoutes);
app.use("/api/businesses/:businessId/customers", customerRoutes);
app.use("/api/businesses/:businessId/orders", orderRoutes);
app.use("/api/businesses/:businessId/dashboard", dashboardRoutes);
app.use(errorHandler);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;