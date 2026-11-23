
const orderService = require("../services/orderService");

exports.create = async (req, res, next) => {
  try {
    const order = await orderService.createDraftOrder(
      req.business.business_id,
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Draft order created successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};


exports.list = async (req, res, next) => {
  try {
    const orders = await orderService.getOrders(
      req.business.business_id
    );

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(
      req.business.business_id,
      req.params.orderId
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.place = async (req, res, next) => {
  try {
    const order = await orderService.placeOrder(
      req.business.business_id,
      req.params.orderId
    );

    res.json({
      success: true,
      message: "Order placed and inventory updated",
      order
    });
  } catch (error) {
    next(error);
  }
};


exports.updateStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(
      req.business.business_id,
      req.params.orderId,
      req.body.order_status
    );

    res.json({
      success: true,
      message: "Order status updated",
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const order = await orderService.updatePaymentStatus(
      req.business.business_id,
      req.params.orderId,
      req.body.payment_status
    );

    res.json({
      success: true,
      message: "Payment status updated",
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDelivery = async (req, res, next) => {
  try {
    const order = await orderService.updateDeliveryStatus(
      req.business.business_id,
      req.params.orderId,
      req.body.delivery_status
    );

    res.json({
      success: true,
      message: "Delivery status updated",
      order
    });
  } catch (error) {
    next(error);
  }
};
