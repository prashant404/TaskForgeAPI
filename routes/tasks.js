const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/task');
const Team = require('../models/team');
const User = require('../models/user');

// @route   GET /api/tasks
// @desc    Get all personal tasks
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const sortBy = req.query.sortBy; // Get sortBy query parameter from the request
    let tasks;

    if (sortBy === "priority") {
      tasks = await Task.find({ user: req.user.id }).sort({ priority: -1 }); // Sort by priority descending
    } else if (sortBy === "dateAdded") {
      tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }); // Sort by createdAt descending
    } else {
      tasks = await Task.find({ user: req.user.id }); // Default: return tasks sorted by order of adding
    }

    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/tasks
// @desc    Create a task
// @access  Private
router.post('/', auth, async (req, res) => {
  const { title, description, dueDate, priority, workspace, team } = req.body;

  try {
    let task;

    if (workspace === 'personal') {
      task = new Task({
        title,
        description,
        dueDate,
        priority,
        user: req.user.id,
        workspace
      });
    } else if (workspace === 'team') {
      if (!team) {
        return res.status(400).json({ msg: 'Team ID is required for team workspace' });
      }
      task = new Task({
        title,
        description,
        dueDate,
        priority,
        user: req.user.id,
        team,
        workspace
      });
    } else {
      return res.status(400).json({ msg: 'Invalid workspace' });
    }

    const newTask = await task.save();
    res.json(newTask);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update the PUT endpoint to handle taskData object
router.put('/:id', auth, async (req, res) => {
  const { title, description, dueDate, priority, completed } = req.body;
  const taskData = { title, description, dueDate, priority, completed };

  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    Object.assign(task, taskData); // Merge taskData with task object
    await task.save();

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// routes/tasks.js

// @route   DELETE /api/tasks/:id
// @desc    Delete a personal task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    // Ensure user owns the task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await task.deleteOne(); // Replace remove() with deleteOne()

    res.json({ msg: 'Task removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/tasks/:teamId
// @desc    Create a task within a team
// @access  Private (team members only)
router.post('/:teamId', auth, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;
    const teamId = req.params.teamId;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ msg: 'Team not found' });
    }

    // Check if the user is a member of the team
    if (!team.members.includes(userId)) {
      return res.status(401).json({ msg: 'Not authorized to create tasks within this team' });
    }

    const newTask = new Task({
      title,
      description,
      dueDate,
      priority,
      user: userId,
      team: teamId
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/tasks/:teamId
// @desc    Get all tasks within a team
// @access  Private (team members only)
router.get('/:teamId', auth, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ msg: 'Team not found' });
    }

    // Check if the user is a member of the team
    if (!team.members.includes(userId)) {
      return res.status(401).json({ msg: 'Not authorized to view tasks within this team' });
    }

    const tasks = await Task.find({ team: teamId }).populate('user', 'username');
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/tasks
// @desc    Get all personal tasks
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const sortBy = req.query.sortBy; // Get sortBy query parameter from the request
    let tasks;

    if (sortBy === "priority") {
      tasks = await Task.find({ user: req.user.id }).sort({ priority: -1 }); // Sort by priority descending
    } else if (sortBy === "dateAdded") {
      tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }); // Sort by createdAt descending
    } else {
      tasks = await Task.find({ user: req.user.id }); // Default: return tasks sorted by order of adding
    }

    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update task status
router.put("/:id/status", auth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { completed } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      { completed },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
