
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import { app } from "./app.js";
dotenv.config();
// dotenv.config({
//   path:'./.env'
// })
// Database Connection
// mysql  DB connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connected via Sequelize");

    await sequelize.sync();


    // await sequelize.sync({ alter: true });
    // await sequelize.sync({ alter: true, logging: console.log });

    // await sequelize.sync({ force: true, logging: console.log });

    console.log("✅ Database synced");

  } catch (err) {
    console.error("❌ DB connection error: " + err.message);
  }
})();


// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started Successfully on port ${PORT}.`);
});