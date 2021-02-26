#!/bin/bash

display_top=10

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

# Extract Needed Info from Controller

general=$(grep "Stopping alerts" $working_dir/general*$dt*)
controller=$(grep "Not creating" $working_dir/controller*$dt*)

printf "\033c"
echo ""

echo -ne "\e[1;4;91m"
echo -n "ALARM STATS FOR $dt_full"
echo -e "\e[0m"

for i in discord telegram
do

   if test -s "$working_dir/$i-$dt.log"
   then

        echo ""
        echo -ne "\e[1;36m"
        echo -n "${i^^} ALARMS SENT : "
        cat $working_dir/$i*$dt* | grep info | egrep "USER|CHANNEL|GROUP|WEBHOOK" | wc -l
        echo -n "${i^^} USERS       : "
        cat $working_dir/$i*$dt* | grep info | egrep "USER|CHANNEL|GROUP|WEBHOOK" | cut -d">" -f2 | sed s/Sending.*//g | sort | uniq -c | wc -l

        for type in USER CHANNEL GROUP WEBHOOK
        do
                type_msg=$(cat $working_dir/$i*$dt* | grep info | grep $type | wc -l)
                if [ $type_msg -gt 0 ]
                then

                        echo ""
                        echo -e "  \e[1;4;35mTOP $display_top $type"
                        echo -e "\e[0m"
                        cat $working_dir/$i*$dt* | grep info | grep $type | cut -d">" -f2 | sed s/Sending.*//g | sort | uniq -c | sort -rn | head -$display_top | while read line
                        do
                                user=$(echo $line | sed s/-//g | rev | cut -d" " -f2 | rev)
                                stops=$(echo "$general" | grep $user | grep -ic "Stopping alerts")
                                msg=$(echo "$controller" | grep $user | grep -ic "Not creating")
                                rl_429=$(grep $user $working_dir/$i*$dt* | grep -ic "429 Rate limit")
                                line=$(echo $line |  LC_ALL=C sed 's/[^\x00-\x7F]//g')
                                printf '%-70s' "     $line"
                                if [ "$stops" -gt "0" ];
                                then
                                        echo -ne "\e[1;31m | "
                                        printf '%-11s'  "RLR : $stops"
                                        printf " | "
                                        printf '%-11s'  "MNC : $msg"
                                        if [ "$rl_429" -gt "0" ];
                                        then
                                                printf " | "
                                                printf '%-11s'  "429 : $rl_429"
                                        fi
                                        echo -e "\e[0;39m"
                                else
                                        echo ""
                                fi

                        done

                fi

        done

   else
      echo -e "\e[1;36m"
      echo "NO ${i^^} ALARMS LOG FILE FOUND for $dt_full"
      echo -e "\e[0m"
   fi

done

stops=$(echo "$general" | grep -c "Stopping alerts")
if [ "$stops" -gt "0" ];
then
        echo ""
        echo -e "\e[31m RLR : Rate Limit Reached"
        echo -e "\e[31m MNC : Messages Not Created"
        echo -e "\e[31m 429 : 429 Rate limit from Discord/Telegram"
fi

echo -e "\e[39m"