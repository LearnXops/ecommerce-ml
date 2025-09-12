const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "api-gateway" });
});

// Service endpoints
const services = {
  auth: process.env.AUTH_SERVICE_URL || "http://auth-service:3001",
  products: process.env.PRODUCT_SERVICE_URL || "http://product-service:3002",
  cart: process.env.CART_SERVICE_URL || "http://cart-service:3003",
  orders: process.env.ORDER_SERVICE_URL || "http://order-service:3004",
  recommendations: process.env.ML_SERVICE_URL || "http://ml-service:3005"
};

// Proxy routes
app.use("/api/auth", createProxyMiddleware({ target: services.auth, changeOrigin: true }));
app.use("/api/products", createProxyMiddleware({ target: services.products, changeOrigin: true }));
app.use("/api/cart", createProxyMiddleware({ target: services.cart, changeOrigin: true }));
app.use("/api/orders", createProxyMiddleware({ target: services.orders, changeOrigin: true }));
app.use("/api/recommendations", createProxyMiddleware({ target: services.recommendations, changeOrigin: true }));

app.listen(PORT, () => {
  console.log("API Gateway running on port " + PORT);
  console.log("Services:", services);
});
