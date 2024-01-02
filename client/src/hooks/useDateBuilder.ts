import { useEffect, useState } from "react";

export default function useDateBuilder(msgDate: string) {

  const [dateString, setDateString] = useState<string>('');

  useEffect(() => {
    saveTheDate();
    const interval = setInterval(() => {

      saveTheDate();
    }, 1000); // Update every minute

    return () => clearInterval(interval); // Clean up on unmount
  }, [msgDate]);

  return dateString;


  function saveTheDate() {
    const messageDate = new Date(msgDate);
    const month = messageDate.getMonth() + 1;
    const day = messageDate.getDate();
    const year = messageDate.getFullYear();
    const hours = messageDate.getHours();
    // const minutes = messageDate.getMinutes();
    const minutes = messageDate.getMinutes().toString().padStart(2, '0');
    // const seconds = messageDate.getSeconds();

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayYear = today.getFullYear();
    // const todayHours = today.getHours();
    // const todayMinutes = today.getMinutes();
    // const todaySeconds = today.getSeconds();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayMonth = yesterday.getMonth() + 1;
    const yesterdayDay = yesterday.getDate();
    const yesterdayYear = yesterday.getFullYear();

    const secondsAgo = Math.floor((today.getTime() - messageDate.getTime()) / 1000);


    // setCurrentTimestamp(new Date);
    // const dateString = 
    setDateString(
      secondsAgo <= 4
        ? 'now'
        : secondsAgo < 60
          ? `${secondsAgo - secondsAgo % 5}s ago`
          : (todayYear === year && todayMonth === month && todayDay === day)
            ? `${hours}:${minutes}`
            : (yesterdayYear === year && yesterdayMonth === month && yesterdayDay === day)
              ? 'Yesterday'
              : `${month}/${day}/${year}`
    );
  }
}