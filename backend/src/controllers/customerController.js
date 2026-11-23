
const service = require("../services/customerService");

exports.create = async (req, res, next) => {
  try {
    const customer = await service.createCustomer(
      req.business.business_id,
      req.body
    );

    res.status(201).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const customers = await service.getCustomers(
      req.business.business_id
    );

    res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const customer = await service.getCustomer(
      req.business.business_id,
      req.params.id
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const customer = await service.updateCustomer(
      req.business.business_id,
      req.params.id,
      req.body
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const customer = await service.deleteCustomer(
      req.business.business_id,
      req.params.id
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      message: "Customer deleted",
      customer_id: customer.customer_id
    });
  } catch (error) {
    next(error);
  }
};
