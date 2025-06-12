import { getUserCount } from './database/user.js';

const userCount = async (req, res, next) => {
  const userCount = await getUserCount();
  if (userCount < 10) {
    next();
  } else {
    res.sendStatus(403);
  }
};

export { userCount };