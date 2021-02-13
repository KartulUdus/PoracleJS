#!/bin/bash

echo_color() { echo -e "\r\033[1A\033[0K$@"; }

# Check Path to Script
script=$(readlink -f "$0")
# Extract Working Dir
script_dir=$(dirname "$script")
working_dir="$script_dir/logs"

if [ -z $1 ];
then
   dt=$(date '+%Y-%m-%d');
   dt_full=$(date '+%A %d %B %Y');
else
   dt=$(date -d "$1" '+%Y-%m-%d')
   dt_full=$(date -d "$1" '+%A %d %B %Y');
fi


printf "\033c"
echo "" 

echo -ne "\e[1;4;91m"
echo -n "ALARM STATS FOR $dt_full"
echo -e "\e[0m"
echo ""

if test -f "$working_dir/discord-$dt.log" 
then

   echo -ne "\e[1;36m"
   echo -n "DISCORD ALARMS SENT : "
   cat $working_dir/discord*$dt* | grep info | egrep "USER|CHANNEL|WEBHOOK" | wc -l
   echo -n "DISCORD USERS       : "
   cat $working_dir/discord*$dt* | grep info | egrep "USER|CHANNEL|WEBHOOK" | cut -d">" -f2 | sed s/Sending.*//g | sort | uniq -c | wc -l
   echo ""
   echo -e "\e[4;35mTOP 10 Users / Channels"
   echo -e "\e[0m"
   cat $working_dir/discord*$dt* | grep info | egrep "USER|CHANNEL|WEBHOOK" | cut -d">" -f2 | sed s/Sending.*//g | sort | uniq -c | sort -rn | head -10
   echo ""

else
   echo -ne "\e[1;36m"
   echo "NO DISCORD ALARMS LOG FILE FOUND for $dt_full"
   echo -e "\e[0m"
fi

if test -f "$working_dir/telegram-$dt.log"
then

   echo -ne "\e[1;36m"
   echo -n "TELEGRAM ALARMS SENT : "
   cat $working_dir/telegram*$dt* | grep info | egrep "USER|CHANNEL|GROUP" | wc -l
   echo -n "TELEGRAM USERS       : "
   cat $working_dir/telegram*$dt* | grep info | egrep "USER|CHANNEL|GROUP" | cut -d">" -f2 | sed s/Sending.*//g | sort | uniq -c | wc -l
   echo "" 
   echo -e "\e[4;35mTOP 10 Users / Channels"
   echo -e "\e[0m"
   cat $working_dir/telegram*$dt* | grep info | egrep "USER|CHANNEL|GROUP" | cut -d">" -f2 | sed s/Sending.*//g | sort | uniq -c | sort -rn | head -10
   echo "" 

else
   echo -ne "\e[1;36m"
   echo "NO TELEGRAM ALARMS LOG FILE FOUND for $dt_full"
   echo -e "\e[0m"
fi

echo ""
