router.get(
  "/pricing/final",
  authMiddleware,
  async (req, res) => {
    try {
      const { customer_id, product_id } = req.query;

      if (!customer_id || !product_id) {
        return res.status(400).json({ message: "Missing params" });
      }

      const price = await getFinalProductPrice(
        Number(customer_id),
        Number(product_id)
      );

      return res.json({ price });
    } catch (err) {
      console.error("FETCH FINAL PRICE ERROR:", err);
      return res.status(500).json({ message: "Failed to fetch price" });
    }
  }
);