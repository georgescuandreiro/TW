module.exports = function produsSchema(sequelize, Sequelize) {
  return sequelize.define(
    "Produs",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      nume: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      descriere: Sequelize.TEXT,
      imagine: Sequelize.TEXT,
      tip: Sequelize.TEXT,
      internet: Sequelize.INTEGER,
      pret: Sequelize.INTEGER,
      stocare: Sequelize.INTEGER,
      data: Sequelize.TEXT,
      culoarea: Sequelize.TEXT,
      easybox: Sequelize.INTEGER,
    },
    {
      tableName: "produse",
      timestamps: false,
    }
  );
};
