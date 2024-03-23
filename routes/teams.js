// routes/teams.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Team = require('../models/team');
const User = require('../models/user');

// @route   GET /api/teams
// @desc    Get all teams
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({ members: req.user.id }).populate('createdBy', 'username').populate('members', 'username');
    res.json(teams);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/teams
// @desc    Create a team
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;

  try {
    const newTeam = new Team({
      name,
      description,
      createdBy: req.user.id,
      members: [req.user.id]
    });

    const team = await newTeam.save();
    res.json(team);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/teams/:id
// @desc    Update a team
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { name, description } = req.body;

  try {
    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ msg: 'Team not found' });
    }

    // Check if the user is the creator of the team
    if (team.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Update team fields
    team.name = name;
    team.description = description;

    await team.save();

    res.json(team);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete a team
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ msg: 'Team not found' });
    }

    // Check if the user is the creator of the team
    if (team.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Delete the team
    await team.deleteOne();

    res.json({ msg: 'Team removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
// @route   POST /api/teams/:teamId/members
// @desc    Add member to team
// @access  Private (only team owner or admin)
router.post('/:teamId/members', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    // Check if user is team owner or admin
    if (team.owner.toString() !== req.user.id && !team.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to add members to this team' });
    }

    const { username } = req.body;

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Add user to team members
    if (!team.members.includes(user.id)) {
      team.members.push(user.id);
      await team.save();
    }

    res.json({ msg: 'Member added to team successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/teams/:teamId/members/:userId
// @desc    Remove member from team
// @access  Private (only team owner or admin)
router.delete('/:teamId/members/:userId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);

    // Check if user is team owner or admin
    if (team.owner.toString() !== req.user.id && !team.members.includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized to remove members from this team' });
    }

    // Check if user to be removed is not the owner
    if (team.owner.toString() === req.params.userId) {
      return res.status(400).json({ msg: 'Cannot remove team owner from team' });
    }

    // Remove user from team members
    team.members = team.members.filter(memberId => memberId.toString() !== req.params.userId);
    await team.save();

    res.json({ msg: 'Member removed from team successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
