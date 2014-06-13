<?php
// Connecting, selecting database
$link = mysql_connect('jetpoo.db', 'guest', 'wertiu87')
	or die('Could not connect: ' . mysql_error());
mysql_select_db('hellocannon2') or die('Could not select database');

// Performing SQL query
$query = 'SELECT name, shots, gold, substring(from_unixtime(timePlayed / 1000), 11), from_unixtime(timeFinished / 1000), eyes, invalid FROM scores ORDER BY timeFinished DESC';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());

// Printing results in HTML
?>

<style type="text/css">
<!--
thead {
	font-weight: bold;
}
tbody tr:nth-child(odd) {
	background-color: #ffffff;
}
tbody tr:nth-child(even) {
	background-color: #eeeeff;
}
td {
	max-width: 165px;
	overflow-x: hidden;
	white-space: nowrap;
}
-->
</style>

<?php
echo "<table>\n";
echo "<thead>"."</thead>\n";
echo "<tbody>\n";
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
	echo "\t<tr>\n";
	foreach ($line as $col_value) {
		echo "\t\t<td>$col_value</td>\n";
	}
	echo "\t</tr>\n";
}
echo "</tbody>\n";
echo "</table>\n";

// Free resultset
mysql_free_result($result);

// Closing connection
mysql_close($link);

?>
