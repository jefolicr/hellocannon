<?php
// Connecting, selecting database
$link = mysql_connect('jetpoo.db', 'guest', 'wertiu87')
    or die('Could not connect: ' . mysql_error());
mysql_select_db('hellocannon') or die('Could not select database');

// Performing SQL query
$query = 'SELECT * FROM scores ORDER BY shots DESC';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());

// Printing results in JSON
$rows = array();
$i = 0;
while(($r = mysql_fetch_assoc($result)) && $i < 12) {
    $less = array();
    $less["shots"] = $r["shots"];
    $less["name"] = $r["name"];
    $rows[] = $less;
    $i++;
}
print json_encode($rows);

// Free resultset
mysql_free_result($result);

// Closing connection
mysql_close($link);
?>