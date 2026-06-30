export const jwtConfig = {
  // user: {
  //   secret: process.env.JWT_SECRET,
  //   expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  //   refreshSecret: process.env.JWT_REFRESH_SECRET,
  //   refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  // },
  admin: {
    secret: process.env.ADMIN_JWT_SECRET,
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "8h",   // strict: 8 hours only
    refreshSecret: process.env.ADMIN_JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.ADMIN_JWT_REFRESH_EXPIRES_IN || "1d",
  },
};