const QuizStreak = require("../models/QuizStreak");
const User = require("../models/User");

const handleStreak = async (userId, currentDateTime) => {
  // Normalize to start of day using currentDateTime from joinQuiz
  const today = new Date(currentDateTime);
  today.setHours(0, 0, 0, 0);

  let streak = await QuizStreak.findOne({ userId });

  // First time user
  if (!streak) {
    streak = await QuizStreak.create({
      userId,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedDate: today,
      lives: 1,
      lifeLastGiven: currentDateTime
    });
    return { streak, reward: null };
  }

  // Monthly life refill check
  const now = new Date(currentDateTime);
  const monthDiff = (now.getFullYear() - streak.lifeLastGiven.getFullYear()) * 12 +
                    (now.getMonth() - streak.lifeLastGiven.getMonth());
  if (monthDiff >= 1) {
    streak.lives += 1;
    streak.lifeLastGiven = now;
  }

  const lastDate = new Date(streak.lastPlayedDate);
  const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already played today → do nothing
    return { streak, reward: null };
  }

  if (diffDays === 1) {
    // Consecutive day
    streak.currentStreak++;
  } else {
    // Missed days
    if (streak.lives > 0 && (!streak.countdownEndTime || streak.countdownEndTime >= now)) {
      streak.lives--;
    } else {
      streak.currentStreak = 1;
    }
  }

  // Best streak update
  if (streak.currentStreak > streak.bestStreak) {
    streak.bestStreak = streak.currentStreak;
  }

  // Reward milestones
  const rewardMilestones = { 5: 10, 10: 25, 20: 50, 50: 75, 100: 100 };
  let reward = null;
  if (
    rewardMilestones[streak.currentStreak] &&
    !streak.rewardsHistory.find(r => r.streakDay === streak.currentStreak)
  ) {
    reward = rewardMilestones[streak.currentStreak];
    streak.rewardsHistory.push({
      streakDay: streak.currentStreak,
      rewardAmount: reward
    });

    // Add reward to wallet
    const user = await User.findById(userId);
    if (user) {
      user.wallet = (parseFloat(user.wallet) + reward).toFixed(2);
      await user.save();
    }
  }

  streak.lastPlayedDate = today;
  await streak.save();

  return { streak, reward };
};

module.exports = handleStreak;
