const userModel = require("../../models/userModel")

async function updateUser(req, res) {
    try {
        const sessionUser = req.userId;  // User's session ID
        const { userId, email, name, role } = req.body;

        // Authorization: Ensure only the user or an admin can update their information
        if (sessionUser !== userId && req.userRole !== "admin") {
            return res.status(403).json({
                message: "You do not have permission to update this user.",
                error: true,
                success: false
            });
        }

        // Create the payload to update
        const payload = {
            ...(email && { email: email }),
            ...(name && { name: name }),
            ...(role && { role: role }),
        };

        // Find the user by ID
        const user = await userModel.findById(sessionUser);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        // Update the user data
        const updatedUser = await userModel.findByIdAndUpdate(userId, payload, { new: true });

        // If no user was found to update, return error
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found to update",
                error: true,
                success: false
            });
        }

        // Respond with success
        res.json({
            data: updatedUser,
            message: "User Updated",
            success: true,
            error: false
        });

    } catch (err) {
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false
        });
    }
}

module.exports = updateUser;
