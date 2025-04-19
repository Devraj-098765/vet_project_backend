import bcrypt from "bcrypt";
import { Admin } from "../models/admin.js";

const seedAdmin = async () => {
  const adminData = {
    email: "vetcaresystem12@gmail.com",
    password: "abhisek2025",
    role: "admin",
  };

  // Check if the admin already exists
  let admin = await Admin.findOne({ email: adminData.email });
  if (!admin) {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Create and save the admin user
    admin = new Admin(adminData);
    await admin.save();
  } else {
    console.log("Fixed admin user already exists.");
  }
};

export default seedAdmin;
