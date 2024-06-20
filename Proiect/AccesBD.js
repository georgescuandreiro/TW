const produsSchema = require("./models/Produs");
const { Sequelize, QueryTypes } = require("sequelize");

class AccesBD {
  // folosim o var privata statica sa tinem evidenta daca obiectul a fost creat deja
  static #conectat = false;
  #sequelize = null;

  static instanta() {
    if (this.#conectat === false) {
      return new AccesBD();
    } else {
      throw new Error("Only one connection to the db is allowed.");
    }
  }

  constructor() {
    if (AccesBD.#conectat !== false) {
      throw new Error("Only one connection to the db is allowed.");
    }
    this.#sequelize = new Sequelize({
      dialect: "sqlite",
      storage: "./baza.db",
    });
    produsSchema(this.#sequelize, Sequelize);
    AccesBD.#conectat = true;
  }

  async testConnection() {
    try {
      await this.#sequelize.authenticate();
      console.log("Connection has been established successfully.");
    } catch (error) {
      console.error("Unable to connect to the database:", error);
    }
  }

  async getAll() {
    const res = await this.#sequelize.model("Produs").findAll({ raw: true });
    return res;
  }

  async getByTypes(types) {
    const res = await this.#sequelize.model("Produs").findAll({
      raw: true,
      where: {
        tip: {
          [Sequelize.Op.or]: types,
        },
      },
    });
    return res;
  }

  //TODO implement close method to close connection to db and set #con to null, call it in graceful shutdown by express maybe
}

module.exports = AccesBD;
