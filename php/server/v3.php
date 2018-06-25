<?php

/**
 * Search and display recent confinement data.
 *
 * new in v3: cache results in 2 hour increments 
 * to improve server performance
 * 
 * LICENSE: None.
 *
 * @author      Kelly Davis <kellydavis1974 at gmail dot com> adapted 
 * from original by Chris Hessert <chris dot hessert at gmail dot com>
 * @version     Release 2.0
 * @since       File available since Release 0.1.0
 */

/*  Declarations  */
$data = array();
date_default_timezone_set('America/New_York');
$file = dirname(__FILE__).'/cache/cache.txt';
$start= -$_GET["start"];
$end = -$_GET["end"];
$sources = array(
	0 => array(
		'agency'	=> 'Beaufort County',
        //'url'		=> 'http://mugshots.bcgov.net/booked3.xml'
        'url'		=> 'http://mugshots.bcgov.net/booked90.xml'
	)
);

if (!file_exists('cache'))
    mkdir('cache');

    $startTarget = strtotime("-90 days 0:0:0", strtotime('now'));
    $endTarget = strtotime("0 days 0:0:0", strtotime('now'));
    $userStart = strtotime("$start days 0:0:0", strtotime('now'));
    $userEnd = strtotime("$end days 0:0:0", strtotime('now'));

/* debug */
//$test = array();

/*  App  */
// does the cache file exist, or is it stale 
// (let's say, more than 2 hours old?
if (!file_exists($file) || time()-filemtime($file) > 2*3600) {
    $i = 0;
    foreach ($sources as $source) {
        $data[$i]['agency'] = $source['agency'];
        $data[$i]['url'] = $source['url'];
        $data[$i]['success'] = true;
        $xml = simplexml_load_file($source['url']);
        $data[$i]['data'] = array();
        $j = 0;
        foreach ($xml->ins->in as $inmate) {
            $booked = date_create_from_format('G:i:s m/d/y', (string) $inmate->bd);
            $timestamp = strtotime($booked->setTime(0, 0, 0)->format('Y-m-d H:i:s'));

            // Only process inmates for the date target window.
            if ($timestamp >= $startTarget && $timestamp <= $endTarget) {

            /* debug */
                //$test[] = $inmate;

                $name_last = (string) $inmate->nl;
                $name_first = (string) $inmate->nf;
                $name_middle = (string) $inmate->nm;

                $data[$i]['data'][$j]['last'] = $name_last;
                $data[$i]['data'][$j]['first'] = $name_first;
                $data[$i]['data'][$j]['middle'] = $name_middle;


                // Address.
                $data[$i]['data'][$j]['city'] = (string) $inmate->csz;

                // Race
                $data[$i]['data'][$j]['race'] = (string) explode(" / ", $inmate->racegen)[0];
            
                // Gender
                $data[$i]['data'][$j]['sex'] = (string) explode(" / ", $inmate->racegen)[1];

                // Date of birth. Needs a little wrangling because of two-digit pre-epoch years;
                // strtotime() is not reliable since it maps values between 0-69 to 2000-2069
                // and values between 70-100 to 1970-2000.
                // Helped here by fact that we also get their age so we can just subtract
                // age from current year to yield birth year
                $dob = explode("/", $inmate->dob);
                $inmate->dob = $dob[0]."/".$dob[1]."/".(date("Y") - $inmate->age);
                $data[$i]['data'][$j]['dob'] = (string) date("M j, Y", strtotime($inmate->dob));
            
                // Age.
                $data[$i]['data'][$j]['age'] = (string) $inmate->age;

                // Height.
                $data[$i]['data'][$j]['height'] = (string) $inmate->ht;

                // Weight.
                $data[$i]['data'][$j]['weight'] = (string) $inmate->wt;

                // Mugshot: make sure it's an actual image file.
                $url_mug = (string) $inmate->image1['src'];
                if (preg_match('/\.(jpeg|jpg|png|gif)$/i', $url_mug)) {
                    $data[$i]['data'][$j]['photo'] = $url_mug;
                }
                $data[$i]['data'][$j]['timestamp'] = $timestamp;
                // arrest info
                // is there any?
                if (array_key_exists("ar", $inmate)) {
                    $data[$i]['data'][$j]['arrestinfo'][]['present'] = (boolean) true;
                    $data[$i]['data'][$j]['arrestinfo'][] = $inmate->ar;
                }
                // Booking number.
                $data[$i]['data'][$j]['booknum'] = (string) $inmate->bn;
            
                // Booking date and time.
                $data[$i]['data'][$j]['booktime'] = (string) date("g:i a, M j, Y", strtotime($inmate->bd));

                // Release date
                $data[$i]['data'][$j]['reldate'] = ($inmate->dtout == "Confined") ? (string) "Confined" : (string) date("g:i a", strtotime($inmate->tmout)).", ".date("M j, Y", strtotime($inmate->dtout));
            
                // Inmate number.
                $data[$i]['data'][$j]['inmatenum'] = (string) $inmate->nn;

                $j++;
            }
        }
        $i++;
    }
    // cache this 90 days' worth of data
    $data[0]['cached'] = false;
    $data_to_cache = json_encode($data[0],true);
    file_put_contents($file,$data_to_cache);

    // send back only data requested
    $inmateData = $data[0]['data'];
    $data[0]['data'] = Array();
    foreach ($inmateData as $inmate) {

            if ($inmate['timestamp'] >= $userStart && $inmate['timestamp'] <= $userEnd) {
                $data[0]['data'][] = $inmate;
            }
    };
    header('Content-Type: application/json');
    echo json_encode( $data[0] );
 
} // end cache is non-existent or stale condition
else {
    // get the cached data
    $data = json_decode(file_get_contents($file));
    // flag this as cached data
    $data->cached = true;
   // extract the data requested by the user
   $inmateData = $data->data;
   $data->data = Array();
   foreach ($inmateData as $inmate){
            if (property_exists($inmate,'timestamp')) {
                if ($inmate->timestamp >= $userStart && $inmate->timestamp <= $userEnd) {
                    $data->data[] = $inmate;
                };
        };
   };
    header('Content-Type: application/json');
    echo json_encode( $data );
    /* debug */
    //echo json_encode( $test );
}


?>