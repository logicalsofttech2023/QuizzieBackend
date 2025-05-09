const User = require("../models/user_model");
const Otp = require("../models/otp_model");
const Avatar = require("../models/avatar_model");
const asyncHandler = require("express-async-handler");
const generateToken = require("../config/jwt_token");
const { validateMongoDbId } = require("../utils/validate_mongo_db_id");
const { sendSMS } = require("../utils/send_sms");
const { sendWelcomeMail } = require("../utils/send_mail");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const lodash = require("lodash");

const generateOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.json({
      code: 400,
      status: false,
      message: "Invalid mobile number",
    });
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const user = await User.findOneAndUpdate(
    { mobile },
    { otp, otpCreatedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Optionally: sendSMS(`+91${mobile}`, `Your OTP is: ${otp}`);

  res.json({
    code: 200,
    status: true,
    message: "OTP generated and saved",
    otp,
  });
});


const verifyOtp = asyncHandler(async (req, res) => {
    try {
      const { mobile, otp } = req.body;
  
      const user = await User.findOne({ mobile });
  
      if (!user) {
        return res.json({
          code: 404,
          status: false,
          message: "User does not exist",
        });
      }
  
      const isExpired = new Date() - new Date(user.otpCreatedAt) > 5 * 60 * 1000;
  
      if (isExpired) {
        return res.json({ code: 410, status: false, message: "OTP has expired" });
      }
  
      if (user.otp !== otp) {
        return res.json({ code: 401, status: false, message: "Invalid OTP" });
      }
  
      // OTP is correct
      user.isMobileNumberVerified = true;
      user.otp = undefined;
      user.otpCreatedAt = undefined;
      await user.save();
  
      // If user is already registered (email and password exist)
      if (user.userEmail) {
        const token = generateToken(user._id);
  
        return res.json({
          code: 200,
          status: true,
          message: "OTP verified and user already registered",
          isRegistered: true,
          token,
          result: {
            firstname: user.firstname,
            lastname: user.lastname,
            userEmail: user.userEmail,
            mobile: user.mobile,
            profile_pic: user.profilePic,
            userId: user._id,
          },
        });
      }
  
      // If not registered yet, just confirm OTP verified
      return res.json({
        code: 210,
        status: true,
        message: "OTP verified successfully",
        isRegistered: false,
      });
  
    } catch (error) {
      throw new Error(error);
    }
  });

const resendOtp = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.json({
      code: 400,
      status: false,
      message: "Invalid mobile number",
    });
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const user = await User.findOneAndUpdate(
    { mobile },
    { otp, otpCreatedAt: new Date() },
    { new: true }
  );

  if (!user) {
    return res.json({
      code: 404,
      status: false,
      message: "Mobile number not registered yet",
    });
  }

  // Optionally: sendSMS(`+91${mobile}`, `Your new OTP is: ${otp}`);

  res.json({
    code: 200,
    status: true,
    message: "OTP resent successfully",
    otp,
  });
});

const registerUser = asyncHandler(async (req, res) => {
  const { firstname, lastname, userEmail, mobile } = req.body;

  const user = await User.findOne({ mobile });

  if (!user) {
    return res.json({
      code: 404,
      status: false,
      message: "User not found. Please generate OTP first.",
    });
  }

  if (!user.isMobileNumberVerified) {
    return res.json({
      code: 403,
      status: false,
      message: "Mobile number not verified. Please verify OTP.",
    });
  }

  if (user.userEmail) {
    return res.json({
      code: 409,
      status: false,
      message: "User already registered with userEmail",
    });
  }

  const allAvatars = await Avatar.find();
  const profilePicUrl = lodash.sample(allAvatars)?.url || "default-avatar.png";

  user.firstname = firstname;
  user.lastname = lastname;
  user.userEmail = userEmail;
  user.profilePic = profilePicUrl;

  await user.save();

  const token = generateToken(user._id);

  res.json({
    code: 200,
    status: true,
    message: "User registered successfully",
    token,
    result: {
      firstname: user.firstname,
      lastname: user.lastname,
      userEmail: user.userEmail,
      mobile: user.mobile,
      profile_pic: user.profilePic,
      createdAt: user.createdAt,
    },
  });
});

const createUser = asyncHandler(async (req, res) => {
  const userEmail = req.body.userEmail;
  const mobile = req.body.mobile;

  try {
    const findUserByEmail = await User.findOne({ userEmail: userEmail });
    const findUserByMobile = await User.findOne({ mobile: mobile });

    const allAvatars = await Avatar.find();
    const randomProfilePic = lodash.sample(allAvatars);
    const profilePicUrl = randomProfilePic?.url || "default-avatar-url.png"; // provide a fallback or handle accordingly

    if (findUserByEmail) {
      return res.json({
        code: 404,
        status: false,
        message: "Email address already exists",
      });
    }

    if (findUserByMobile) {
      return res.json({
        code: 404,
        status: false,
        message: "Mobile number already exists. Please try to login",
      });
    }

    if (!findUserByEmail && !findUserByMobile) {
      const newUser = await User.create({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        userEmail: req.body.userEmail,
        mobile: req.body.mobile,
        password: req.body.password,
        profilePic: profilePicUrl,
      });

      const result = {
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        userEmail: newUser.userEmail,
        mobile: newUser.mobile,
        _id: newUser._id,
        profile_pic: newUser.profilePic,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      };

      // Generate OTP and save it to the Otp collection
      const generatedOtp = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
        digits: true,
      });
      await Otp.findOneAndUpdate(
        { mobile: newUser.mobile },
        { otp: generatedOtp, createdAt: new Date() },
        { upsert: true }
      );

      // Send the OTP to the user's mobile number using sms service
      // sendSMS(`+91${newUser.mobile}`, `Your Quizze Thunder OTP code is: ${generatedOtp}`)
      //     .then(message => console.log('OTP sent:', message.sid))
      //     .catch(error => console.error('Error sending OTP:', error));

      // // Send welcome mail to new user
      // sendWelcomeMail(newUser.email, newUser.firstname);

      res.json({
        code: 200,
        status: true,
        message: "User created successfully",
        result: result,
        otp: generatedOtp,
      });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const verifyMobileOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    // Validate mobile number format (you may need to adjust this based on your mobile number format).
    const mobileRegex = /^\d{10}$/;
    if (!mobile.match(mobileRegex)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid mobile number format",
      });
    }

    // Find the user with the given mobile number
    const user = await User.findOne({ mobile: mobile });

    if (!user) {
      return res.json({ code: 404, status: false, message: "User not found" });
    }

    // Check if the mobile number is already verified
    if (user.isMobileNumberVerified) {
      return res.json({
        code: 200,
        status: true,
        message: "Mobile number is already verified",
      });
    }

    // Find the OTP document for the given mobile number
    const otpDocument = await Otp.findOne({ mobile: mobile });

    if (!otpDocument) {
      return res.json({ code: 404, status: false, message: "OTP not found" });
    }

    // Check if the provided OTP matches the one in the database
    if (otp === otpDocument.otp) {
      // Check if the OTP is expired
      const currentTime = new Date();
      const createdAtTime = otpDocument.createdAt;
      const otpExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (currentTime - createdAtTime > otpExpirationTime) {
        // OTP is expired
        return res.json({
          code: 404,
          status: false,
          message: "OTP has expired",
        });
      }

      // If the OTP is not expired, mark the mobile number as verified in the user document
      await User.findByIdAndUpdate(
        user._id,
        {
          isMobileNumberVerified: true,
        },
        {
          new: true,
        }
      );

      // Delete the OTP document after successful verification
      await otpDocument.deleteOne();

      return res.json({
        code: 200,
        status: true,
        message: "Mobile number verified successfully. Please login",
      });
    } else {
      return res.json({ code: 404, status: false, message: "Invalid OTP" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;
  try {
    // Validate mobile number format (you may need to adjust this based on your mobile number format).
    const mobileRegex = /^\d{10}$/;
    if (!mobile.match(mobileRegex)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid mobile number format",
      });
    }

    const user = await User.findOne({ mobile: mobile });
    if (user) {
      if (await user.isPasswordMatched(password)) {
        if (!user.isMobileNumberVerified) {
          // Mobile number is not verified, send OTP to the user's mobile number
          const generatedOtp = otpGenerator.generate(6, {
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
            digits: true,
          });
          await Otp.findOneAndUpdate(
            { mobile: mobile },
            { otp: generatedOtp, createdAt: new Date() },
            { upsert: true }
          );

          // Send the generatedOtp to the user's mobile number using sms service
          // sendSMS(`+91${mobile}`, `Your Quizze Thunder OTP code is: ${generatedOtp}`)
          //     .then(message => console.log('OTP sent:', message.sid))
          //     .catch(error => console.error('Error sending OTP:', error));

          return res.json({
            code: 210,
            status: true,
            message:
              "OTP has been sent successfully on your given phone number",
            otp: generatedOtp,
          });
        }

        if (user.isBlocked) {
          return res.json({
            code: 404,
            status: false,
            message: "You can't login because you are blocked by the admin",
          });
        }

        const result = {
          _id: user._id,
          firstname: user.firstname,
          lastname: user.lastname,
          userEmail: user.userEmail,
          mobile: user.mobile,
          about: user.about,
          profile_pic: user.profilePic,
          token: generateToken(user._id),
        };

        res.json({
          code: 200,
          status: true,
          message: "Login successfully",
          result: result,
        });
      } else {
        res.json({ code: 404, status: false, message: "Invalid Credentials" });
      }
    } else {
      res.json({ code: 404, status: false, message: "Invalid Credentials" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const adminLogin = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;
  try {
    // Validate mobile number format (you may need to adjust this based on your mobile number format).
    const mobileRegex = /^\d{10}$/;
    if (!mobile.match(mobileRegex)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid mobile number format",
      });
    }

    const user = await User.findOne({ mobile: mobile });
    if (user) {
      if (user.role === "admin") {
        if (await user.isPasswordMatched(password)) {
          const result = {
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            userEmail: user.userEmail,
            mobile: user.mobile,
            profile_pic: user.profilePic,
            token: generateToken(user._id),
          };
          res.json({
            code: 200,
            status: true,
            message: "Login successfully",
            result: result,
          });
        } else {
          res.json({
            code: 404,
            status: false,
            message: "Invalid Credentials",
          });
        }
      } else {
        res.json({ code: 404, status: false, message: "Login as Amdin" });
      }
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  const isAdmin = req.query.isAdmin === "true" || false;
  const search = req.query.search;

  try {
    let query = { role: isAdmin ? "admin" : "user" };

    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: "i" } }, // Case-insensitive firstname search
        { userEmail: { $regex: search, $options: "i" } }, // Case-insensitive email search
        { mobile: { $regex: search, $options: "i" } }, // Case-insensitive mobile search
      ];
    }

    const allUsers = await User.find(query);
    const userCount = allUsers.length;
    if (allUsers.length > 0) {
      res.json({
        code: 200,
        status: true,
        count: userCount,
        users: allUsers,
      });
    } else {
      res.json({ code: 404, status: false, message: "No users found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const getSpecificUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const user = await User.findById(user_id).select("-password");
    if (user) {
      res.json({ code: 200, status: true, user: user });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const deleteSpecificUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const deleteUser = await User.findByIdAndDelete(user_id);
    if (deleteUser) {
      res.json({
        code: 200,
        status: true,
        message: "User deleted successfully",
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { _id, role } = req.user;
  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    // If the requester is not an admin and is trying to update another user's details, return a 403 Forbidden response.
    if (role !== "admin" && user_id !== _id.toString()) {
      return res.json({
        code: 403,
        status: false,
        message: "You do not have permission to update this user",
      });
    }
    const updateFields = {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      about: req.body.about,
      profilePic: req.body.profile_pic,
    };

    // If the requester is an admin, allow them to update additional fields
    if (role === "admin") {
      if (req.body.userEmail) {
        updateFields.userEmail = req.body.userEmail;
      }
      if (req.body.mobile) {
        updateFields.mobile = req.body.mobile;
      }
      updateFields.isMobileNumberVerified = req.body.isMobileNumberVerified;
      updateFields.isEmailVerified = req.body.isEmailVerified;
      updateFields.isBlocked = req.body.isBlocked;
    }

    const updatedUser = await User.findByIdAndUpdate(user_id, updateFields, {
      new: true,
    }).select("-password");
    if (updateUser) {
      res.json({
        code: 200,
        status: true,
        message: "Profile details has been updated succefully",
        updatedUser: updatedUser,
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const updateUserBlockStatus = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const { isBlocked } = req.body;

  try {
    // Check if the provided user_id is a valid ObjectId
    if (!validateMongoDbId(user_id)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid user_id format",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      {
        isBlocked: isBlocked,
      },
      {
        new: true,
      }
    );

    if (updatedUser) {
      const message = isBlocked
        ? "User blocked successfully"
        : "User unblocked successfully";
      res.json({ code: 200, status: true, message });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const logout = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const user = await User.findById(_id);
    if (user) {
      res.json({
        code: 200,
        status: true,
        message: "User logged out successfully",
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  try {
    // Validate mobile number format (you may need to adjust this based on your mobile number format).
    const mobileRegex = /^\d{10}$/;
    if (!mobile.match(mobileRegex)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid mobile number format",
      });
    }

    const user = await User.findOne({ mobile: mobile }).select("-password");
    if (user) {
      // Generate OTP and save it to the Otp collection
      const generatedOtp = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
        digits: true,
      });
      await Otp.findOneAndUpdate(
        { mobile: user.mobile },
        { otp: generatedOtp, createdAt: new Date() },
        { upsert: true }
      );

      // Send the OTP to the user's mobile number using sms service
      sendSMS(
        `+91${user.mobile}`,
        `Your Quizze Thunder OTP code is: ${generatedOtp}`
      )
        .then((message) => console.log("OTP sent:", message.sid))
        .catch((error) => console.error("Error sending OTP:", error));

      res.json({
        code: 200,
        status: true,
        message: "Verification code has been sent to your given mobile number",
      });
    } else {
      res.json({ code: 404, status: false, message: "User not found" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const createNewPassword = asyncHandler(async (req, res) => {
  const { mobile, otp, new_password } = req.body;

  try {
    // Validate mobile number format (you may need to adjust this based on your mobile number format).
    const mobileRegex = /^\d{10}$/;
    if (!mobile.match(mobileRegex)) {
      return res.json({
        code: 404,
        status: false,
        message: "Invalid mobile number format",
      });
    }

    // Find the user with the given mobile number
    const user = await User.findOne({ mobile: mobile });

    if (!user) {
      return res.json({ code: 404, status: false, message: "User not found" });
    }

    // Find the OTP document for the given mobile number
    const otpDocument = await Otp.findOne({ mobile: mobile });

    if (!otpDocument) {
      return res.json({ code: 404, status: false, message: "OTP not found" });
    }

    // Check if the provided OTP matches the one in the database
    if (otp === otpDocument.otp) {
      // Check if the OTP is expired
      const currentTime = new Date();
      const createdAtTime = otpDocument.createdAt;
      const otpExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

      console.log(
        "currentTime = " + currentTime + " createdAtTime = " + createdAtTime
      );

      if (currentTime - createdAtTime > otpExpirationTime) {
        // OTP is expired
        return res.json({
          code: 404,
          status: false,
          message: "OTP has expired",
        });
      }

      // Hash the new password before updating.
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);

      // If the OTP is not expired, update the new password in the user document
      await User.findByIdAndUpdate(
        user._id,
        {
          password: hashedPassword,
        },
        {
          new: true,
        }
      );

      // Delete the OTP document after successful verification
      await otpDocument.deleteOne();

      return res.json({
        code: 200,
        status: true,
        message: "New password created successfully. Please login",
      });
    } else {
      return res.json({ code: 404, status: false, message: "Invalid OTP" });
    }
  } catch (err) {
    throw new Error(err);
  }
});

const updatePassword = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  const { new_password } = req.body;
  try {
    // Find the user by user id.
    const user = await User.findById(_id);
    if (!user) {
      return res.json({ code: 404, status: false, message: "User not found" });
    }

    // Hash the new password before updating.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update the user's password.
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        password: hashedPassword,
      },
      {
        new: true,
      }
    );

    if (updatedUser) {
      res.json({
        code: 200,
        status: true,
        message: "Password updated successfully. Please login",
      });
    } else {
      res.json({
        code: 404,
        status: false,
        message: "Failed to update password",
      });
    }
  } catch (err) {
    next(err); // Pass the error to the global error handler.
  }
});

module.exports = {
  createUser,
  loginUser,
  verifyMobileOtp,
  adminLogin,
  getAllUsers,
  getSpecificUser,
  deleteSpecificUser,
  updateUser,
  updateUserBlockStatus,
  logout,
  forgotPassword,
  createNewPassword,
  updatePassword,
  generateOtp,
  verifyOtp,
  resendOtp,
  registerUser,
};
