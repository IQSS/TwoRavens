#!/usr/bin/perl

use strict;
use warnings;
use Getopt::Long;
use Socket;
use File::Copy;

my $verbose;
my $yes; 

my ($rez) = GetOptions(
    "verbose"      => \$verbose
);

# hostname:

my $hostname_from_cmdline = `hostname`;
chop $hostname_from_cmdline;


my @CONFIG_VARIABLES = (
    'TWORAVENS_DIRECTORY',
    'APACHE_CONFIG_DIRECTORY',
    'APACHE_WEB_DIRECTORY',
    'TWORAVENS_URL',
#    'HOST_DNS_ADDRESS',
#    'HOST_PORT',
#    'HOST_PROTOCOL',
    'DATAVERSE_URL'
);

my %CONFIG_DEFAULTS = (
    'TWORAVENS_DIRECTORY',     '/var/www/html/dataexplore',
    'APACHE_CONFIG_DIRECTORY', '/etc/httpd',
    'APACHE_WEB_DIRECTORY',    '/var/www/html',
    'TWORAVENS_URL',           'http://' . $hostname_from_cmdline . ':80',
#    'HOST_DNS_ADDRESS',        $hostname_from_cmdline,
#    'HOST_PORT',               80,
#    'HOST_PROTOCOL',           'http',
    'DATAVERSE_URL',           'http://' . $hostname_from_cmdline . ':8080'

);

my %CONFIG_PROMPTS = (
    'TWORAVENS_DIRECTORY',     'Directory where TwoRavens is installed',
    'APACHE_CONFIG_DIRECTORY', 'Apache config directory',
    'APACHE_WEB_DIRECTORY',    'Apache Web Root directory',
    'TWORAVENS_URL',           'TwoRavens/rApache URL',
#    'HOST_DNS_ADDRESS',        'Internet address of the rApache host',
#    'HOST_PORT',               'rApache port number',
#    'HOST_PROTOCOL',           'http or https?',
    'DATAVERSE_URL',           'URL of the Dataverse application, to access files and metadata'

);


my $user_real = `who am i`;
chop $user_real;
$user_real =~ s/ .*$//;

if ( $< != 0 ) {
    print STDERR "\nERROR: You must be logged in as root to run the installer.\n\n";
    exit 1;
}

print "\nWelcome to the TwoRavens BETA installer.\n";

ENTERCONFIG:

print "\n";
print "Please enter the following configuration values:\n";
print "(hit [RETURN] to accept the default value)\n";
print "\n";

for my $ENTRY (@CONFIG_VARIABLES) {
    print $CONFIG_PROMPTS{$ENTRY} . ": ";
    print "[" . $CONFIG_DEFAULTS{$ENTRY} . "] ";

    my $user_entry;
    $user_entry = <>;
    chop $user_entry;

#    if ($ENTRY eq "HOST_PROTOCOL") {
#	while (($user_entry ne "") && ($user_entry ne "http") && ($user_entry ne "https")) {
#	    print "Please enter 'http' or 'https'!\n";
#	    print "(or ctrl-C to exit the installer)\n";
#	    $user_entry = <>;
#	    chop $user_entry;
#	}
#    }

    if ($ENTRY eq "TWORAVENS_URL" || $ENTRY eq "DATAVERSE_URL") {
	while ($user_entry ne "" && !&validate_url($user_entry)) {
	    print "Sorry, this is not a valid URL!\n";
	    print "Please enter a valid " . $CONFIG_PROMPTS{$ENTRY} . ".\n";
	    print "(or ctrl-C to exit the installer)\n";
	    $user_entry = <>;
	    chop $user_entry;
	}
    }

    if ( $user_entry ne "" ) {
        $CONFIG_DEFAULTS{$ENTRY} = $user_entry; 
	if ($ENTRY eq "TWORAVENS_DIRECTORY") {
	    my $tmpwd = $user_entry;
	    $tmpwd =~s:/dataexplore$::; 
	    unless ($tmpwd eq $user_entry) {
		$CONFIG_DEFAULTS{'APACHE_WEB_DIRECTORY'} = $tmpwd;
	    }
	    # TODO: 
	    # Check that this IS the directory where the script is running.
	}
    }
    print "\n";
}

# CONFIRM VALUES ENTERED:

print "\nOK, please confirm what you've entered:\n\n";

for my $ENTRY (@CONFIG_VARIABLES) {
    print $CONFIG_PROMPTS{$ENTRY} . ": " . $CONFIG_DEFAULTS{$ENTRY} . "\n";
}

my $yesno;

print "\nIs this correct? [y/n] ";
$yesno = <>;
chop $yesno;

while ( $yesno ne "y" && $yesno ne "n" ) {
    print "Please enter 'y' or 'n'!\n";
    print "(or ctrl-C to exit the installer)\n";
    $yesno = <>;
    chop $yesno;
}

if ( $yesno eq "n" ) {
    goto ENTERCONFIG;
}


# 1. Edit R application sources, make necessary changes:

#my $RAPACHEURL = $CONFIG_DEFAULTS{'HOST_PROTOCOL'} . "://" . $CONFIG_DEFAULTS{'HOST_DNS_ADDRESS'};

#if ($CONFIG_DEFAULTS{'HOST_PROTOCOL'} eq "http" && $CONFIG_DEFAULTS{'HOST_PORT'} != 80) {
#    $RAPACHEURL .= (":" . $CONFIG_DEFAULTS{'HOST_PORT'});
#} elsif ($CONFIG_DEFAULTS{'HOST_PROTOCOL'} eq "https" && $CONFIG_DEFAULTS{'HOST_PORT'} != 443) {
#    $RAPACHEURL .= (":" . $CONFIG_DEFAULTS{'HOST_PORT'});
#}

print "\n\nConfiguring TwoRavens Rook applications...\n";

my $TWORAVENS_URL = $CONFIG_DEFAULTS{'TWORAVENS_URL'};

for my $rFile ( "rookdata.R", "rookprivate.R", "rookselector.R", "rooksource.R", "rooksubset.R", "rooktransform.R", "rookutils.R", "rookzelig.R", "rookzeligrestart.R" ) {
    print "Configuring script " . $rFile . "...\n";

    my $rFilePath = "./rook/" . $rFile; 

    unless ( -f $rFilePath ) {
	print "\nERROR: Can't find " . $rFilePath . "!\n";
	print "(are you running the installer in the right directory?)\n";
	exit 1;
    }

    open RFILEIN, $rFilePath || die $@;
    open RFILEOUT, '>' . $rFilePath . ".tmp" || die $@;

    while (<RFILEIN>) {
	# production toggle:
	s/production\<\-FALSE/production\<\-TRUE/g;
	# rApache url for the preprocess/subset directory: 
	s/\"https*:\/\/[a-zA-Z0-9\.\-]+(:[0-9]+)?\/custom\/preprocess_dir\/preprocessSubset_\"/\"$TWORAVENS_URL\/custom\/preprocess_dir\/preprocessSubset_\"/g;
	# rApache url for the generated graph images directory: 
	s/\"https*:\/\/[a-zA-Z0-9\.\-]+(:[0-9]+)?\/custom\/pic_dir\/\"/\"$TWORAVENS_URL\/custom\/pic_dir\/\"/g;
	# working directory (hard-coded to the Glassfish docroot in the TwoRavens distribution):
	s/\/usr\/local\/glassfish4\/glassfish\/domains\/domain1\/docroot\/dataexplore/$CONFIG_DEFAULTS{'TWORAVENS_DIRECTORY'}/g;
	print RFILEOUT $_;
    }

    close RFILEIN;
    close RFILEOUT;

    system ("/bin/mv " . $rFilePath . ".tmp " . $rFilePath);
}

print "Done!\n";

# 2. Install the rApache config file:

print "\n\nConfiguring rApache to serve TwoRavens Rook applications...\n";

my $RAPACHE_CONFIG_FILE     = "tworavens-rapache.conf";

unless ( -f $RAPACHE_CONFIG_FILE ) {
    print "\nWARNING: Can't find " . $RAPACHE_CONFIG_FILE . "!\n";
    print "(are you running the installer in the right directory?)\n";

    exit 0;
}

unless ( -d $CONFIG_DEFAULTS{'APACHE_CONFIG_DIRECTORY'} ) {
    print "\nWARNING: Can't find Apache config directory - " . $CONFIG_DEFAULTS{'APACHE_CONFIG_DIRECTORY'} . "!\n";
    print "(is Apache httpd installed on this system?)\n";

    exit 0;
}

if ($CONFIG_DEFAULTS{'TWORAVENS_DIRECTORY'} eq "/var/www/html/dataexplore") {
    # simply copy the supplied .conf file into the Apache conf.d directory:

    system ("/bin/cp " . $RAPACHE_CONFIG_FILE . " " . $CONFIG_DEFAULTS{'APACHE_CONFIG_DIRECTORY'} . "/conf.d");
} else { 
    # we have to filter the supplied file and insert the correct directory name:

    open CONFIGFILEIN, $RAPACHE_CONFIG_FILE   || die $@;
    open CONFIGFILEOUT,     '>' . $CONFIG_DEFAULTS{'APACHE_CONFIG_DIRECTORY'} . "/conf.d/" . $RAPACHE_CONFIG_FILE || die $@;

    while (<CONFIGFILEIN>) {
      s:/var/www/html/dataexplore:$CONFIG_DEFAULTS{'TWORAVENS_DIRECTORY'}:g;
	print CONFIGFILEOUT $_;
    }
    
    close CONFIGFILEIN;
    close CONFIGFILEOUT;
}

print "\nRestarting Apache...\n";

system ("service httpd restart");

# 3. Application directories

print "\nCreating application directories on the filesystem...\n";


for my $webDir ( "pic_dir", "preprocess_dir", "log_dir" ) {
    system ("mkdir --parents " . $CONFIG_DEFAULTS{'APACHE_WEB_DIRECTORY'} . "/custom/" . $webDir);
    system ("chown -R apache " . $CONFIG_DEFAULTS{'APACHE_WEB_DIRECTORY'} . "/custom/". $webDir);

    unless ( -d $CONFIG_DEFAULTS{'APACHE_WEB_DIRECTORY'} . "/custom/". $webDir) {
	print "\nWARNING: Was unable to create the directory: " . $CONFIG_DEFAULTS{'APACHE_WEB_DIRECTORY'} . "/". $webDir . "!\n";
	exit 0; 
    }
}

print "OK!\n";

# 4. Edit the JavaScript application file: 

print "\n\nConfiguring TwoRavens JavaScript application...\n";

my $TwoRavensWebApp = "app_ddi.js";
unless ( -f $TwoRavensWebApp ) {
    print "\nERROR: Can't find " . $TwoRavensWebApp . "!\n";
    print "(are you running the installer in the right directory?)\n";
    exit 1; 
}

open WEBAPPFILEIN, $TwoRavensWebApp || die $@;
open WEBAPPFILEOUT, '>' . $TwoRavensWebApp . ".tmp" || die $@;

my $DATAVERSE_URL = $CONFIG_DEFAULTS{'DATAVERSE_URL'};

while (<WEBAPPFILEIN>) {
    # production toggle: 
    $_="var production=true;\n" if /^var production=false/;
    # rApache url:
    s/var rappURL = \"https*:\/\/[a-zA-Z0-9\.\-]+(:[0-9]+)?\/custom\/\"/var rappURL = \"$TWORAVENS_URL\/custom\/\"/g;
    # dataverse url: 
    s/%PRODUCTION_DATAVERSE_URL%/$DATAVERSE_URL/g; 
    # but, if the installer has already been run, and the template entry 
    # "%PRODUCTION_DATAVERSE_URL% has already been replaced by a real url - 
    # let's make sure we find and replace that too:
    s/dataverseurl=\"https*:\/\/([a-zA-Z0-9\.\-]+)(:[0-9]+)\"/dataverseurl=\"$DATAVERSE_URL\"/g;
    print WEBAPPFILEOUT $_;
}

close WEBAPPFILEIN;
close WEBAPPFILEOUT;

system ("/bin/mv " . $TwoRavensWebApp . ".tmp " . $TwoRavensWebApp);

print "Done!\n";

# 5. Chown the TwoRavens directory to user Apache:

print "\n\nSetting the ownership of the TwoRavens directory to user apache...\n";

system ("chown -R apache " . $CONFIG_DEFAULTS{'TWORAVENS_DIRECTORY'});

print "\n\nGreat. You should now have a working TwoRavens installation!\n";
print "\nThe application URL is \n";
print $TWORAVENS_URL . "/dataexplore/gui.html\n\n";

sub validate_url {
    my $url = $_[0];

    return 1 if $url=~/^https*:\/\/[a-zA-Z0-9\.\-]+(:[0-9]+)?$/;

    return 0;
    
}
