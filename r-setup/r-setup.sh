#!/bin/sh

echo
echo "Installing additional R packages."
echo
echo "PLEASE NOTE: this may take a while!"
echo ""

sleep 5

# Use an alternative CRAN repository mirror, if r-project.org
# is not available or slow to access from where you are.
CRANREPO="http://cran.r-project.org"; export CRANREPO
# Set this to your local R Library directory, if different:
RLIBDIR=/usr/lib64/R/library; export RLIBDIR

echo 
echo -n "Checking if R Library directory exists..."
if [ "x"$RLIBDIR != "x" ] && [ -d $RLIBDIR ]
then
    echo "ok"
else
    echo "Could not find library directory!"
    if [ "x"$RLIBDIR != "x" ]
	then
	echo "directory $RLIBDIR does not exist."
    else
	echo "R is not installed (?)"
    fi
    exit 1
fi

if [ ! -f "package-versions.txt" ]
then
    echo ""
    echo "ERROR: Cannot find the file package-versions.txt!"
    echo "(Are you running this script in the correct directory?)"
    echo
    exit 1;
fi

cat package-versions.txt | while read RPACK RPACKVERSION
do

    LOG="RINSTALL.$RPACK-native.LOG"
    echo
    echo "Installing package ${RPACK} (from CRAN):"

    if ! wget ${CRANREPO}'/src/contrib/'${RPACK}'_'${RPACKVERSION}'.tar.gz'
    then
	echo "Trying alternative, archived location of the package source:"
	wget ${CRANREPO}'/src/contrib/Archive/'${RPACK}'/'${RPACK}'_'${RPACKVERSION}'.tar.gz'
    fi

    echo ${RPACK}'_'${RPACKVERSION}'.tar.gz'

    if [ -f ${RPACK}'_'${RPACKVERSION}'.tar.gz' ]
    then
	echo "Installing package ${RPACK}"
	echo "(saving build output in RINSTALL.${RPACK}.LOG)"
	echo "This may take a few minutes..."
	echo 'install.packages("'${RPACK}'_'${RPACKVERSION}'.tar.gz", INSTALL_opts=c("--no-test-load"), repos=NULL, type="source")' | (unset DISPLAY; R --vanilla --slave) >${LOG} 2>&1
	echo
	echo "Finished installing ${RPACK};"
	echo
	echo "Attempting to load package ${RPACK}..."
	if (echo 'library("'${RPACK}'")' | (unset DISPLAY; R --slave --vanilla >/dev/null 2>&1))
	then
	    echo "Success!"
	    echo "Package ${RPACK} successfully installed."
	    echo
	    /bin/rm ${RPACK}'_'${RPACKVERSION}'.tar.gz'
	else
	    echo 
	    echo "FATAL ERROR: package ${RPACK} failed to install!"
	    echo 
	    echo "Please consult the log file RINSTALL.${RPACK}.LOG for error messages that may explain the reason for the failure."
	    echo "This will likely be some missing dependency - a gcc compiler not installed, or a wrong version of it, or a missing dev. library..."
	    echo "Try to fix the problem, and run the script again."
	    echo
	    exit 1; 
	fi
	
	echo;
    else
	echo
	echo 'FAILED TO DOWNLOAD '${RPACK}'_'${RPACKVERSION}'.tar.gz!'
	echo;
    fi
done

exit 0



echo 
echo "checking Rserve configuration:" 

/usr/sbin/groupadd -g 97 -o -r rserve >/dev/null 2>/dev/null || :
/usr/sbin/useradd -g rserve -o -r -d $RLIBDIR -s /bin/bash \
        -c "Rserve User" -u 97 rserve 2>/dev/null || :

echo

if [ ! -f /etc/Rserv.conf ]
then
    echo "installing Rserv configuration file."
    install -o rserve -g rserve Rserv.conf /etc/Rserv.conf
    echo 
fi

if [ ! -f /etc/Rserv.pwd ]
then
    echo "Installing Rserve password file."
    echo "Please change the default password in /etc/Rserv.pwd"
    echo "(and make sure this password is set correctly as a"
    echo "JVM option in the glassfish configuration of your DVN)"
    install -m 0600 -o rserve -g rserve Rserv.pwd /etc/Rserv.pwd
    echo
fi

if [ ! -f /etc/init.d/rserve ]
then
    echo "Installing Rserve startup file."
    install rserve-startup.sh /etc/init.d/rserve
    chkconfig rserve on
    echo "You can start Rserve daemon by executing"
    echo "  service rserve start"
    echo
    service rserve start
    echo
fi

echo 
echo "Successfully installed Dataverse R framework."
echo


exit 0
