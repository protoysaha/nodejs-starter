import { Sequelize } from 'sequelize';
import { DB_NAME } from '../constants.js';

const sequelize = new Sequelize("fitness_application", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

// sequelize.authenticate()
//   .then(() => console.log("✅ MySQL Connected via Sequelize"))
//   .catch(err => console.log("❌ Error: " + err));

export default sequelize;