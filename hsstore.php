<?php
// Connect, select database
$link = mysql_connect('jetpoo.db', 'guest', 'wertiu87')
    or die('Could not connect: ' . mysql_error());
mysql_select_db('hellocannon') or die('Could not select database');

// Get score from JSON
$score = $_POST;
//if ($score["name"] == "")
//    die("Invalid score posted: [".implode("#", array_keys($_POST))."]=>[".implode("#", $_POST)."]");

// Extract data, and sanitize
$timePosted = time(); // timestamp in seconds
$timeFinished = gmp_init($score["timeFinished"], 10);
$name = preg_replace('/[^a-zA-Z0-9_ ]/', "", substr($score["name"], 0, 32));
//  html: 
// mysql: mysql_real_escape_string
$timePlayed = (int) $score["timePlayed"];
$eyes = (int) $score["eyes"];
$gold = (int) $score["gold"];
$shots = (int) $score["shots"];

// Perform sanity checks to discourage hacking
$timeFinishedSeconds = gmp_intval(gmp_div($timeFinished, gmp_init(1000)));
if (
    ($eyes <= $shots) and 
    ($gold + 350 > $shots * 55) and 
    ($timePosted - 90 < $timeFinishedSeconds) and // less than 1.5 minute delay in posting score
    ($timePlayed / $shots > 2400)) // greater than 2.4 seconds per shot
{

    // Compute progress hash for sanity check.
    $progress = gmp_sub($timeFinished, gmp_init($timePlayed));
    $progressCheck = false;
    if ($shots < 1000) {
        $progress = gmp_and($progress, gmp_init("0xffffffff"));
        for ($i = 0; $i < $shots; $i++) {
            $progress = gmp_xor(gmp_and(gmp_mul($progress, gmp_init(485207)), gmp_init("0xffffffff")), gmp_init(385179316));
        }
        $progressExpected = gmp_init($score["progress"]);
        if ($score["progress"] < 0)
            $progressExpected = gmp_add($progressExpected, gmp_init("0x100000000"));
        $progressCheck = (gmp_cmp($progress, $progressExpected) == 0);
    }

    if ($progressCheck) {
        // Perform SQL query
        $timeFinished = gmp_strval($timeFinished);
        $query = "INSERT INTO scores (name, timeFinished, timePlayed, eyes, gold, shots) VALUES ('$name', $timeFinished, $timePlayed, $eyes, $gold, $shots)";
        $result = mysql_query($query) or die('Query failed: ' . mysql_error());
    }

}

// Close connection
mysql_close($link);
?>
