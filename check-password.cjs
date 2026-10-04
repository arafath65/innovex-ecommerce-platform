/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");

const password = "NewPassword@123";
const hash = "$2b$12$Jn81916jYrmc10k9de9cWub9jDaGxTbFIr8ELWaHJ53vBEWynI.KC";

bcrypt.compare(password, hash).then((matches) => {
  console.log("Password matches hash:", matches);
});