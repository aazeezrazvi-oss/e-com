module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || ""
  });
};
