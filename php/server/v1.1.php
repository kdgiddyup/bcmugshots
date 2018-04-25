<?php

// {
//     "success": true,
//     "data": [
//     {
//     "last": "GIBBS",
//     "first": "ALEXANDER",
//     "middle": "",
//     "city": "BEAUFORT, SC 29906",
//     "race": "B",
//     "sex": "Male",
//     "dob": "01/08/58",
//     "age": "60",
//     "height": "6'00\"",
//     "weight": "180",
//     "booktime": "07:14:20 04/25/18",
//     "booknum": "21359",
//     "inmatenum": "2143",
//     "reldate": "Confined",
//     "photo": "http://mugshots.bcgov.net/images/43/2143/18042507422300.jpeg",
//     "arrestinfo": [
//     {
//     "present": true
//     },
//     {
//     "aa": [
//     "Beaufort County Sheriff's Ofc"
//     ],
//     "ao": [
//     "Abell, B"
//     ],
//     "bn": [
//     "    21359"
//     ],
//     "bd": [
//     "07:14:20 04/25/18"
//     ],
//     "rd": [
//     "0"
//     ],
//     "of": [
//     {
//     "os": [
//     "16-17-0725/B"
//     ],
//     "ow": [
//     "20180190041577"
//     ],
//     "ol": [
//     "FalseInfo/LEO/traffstop/avoidarr"
//     ],
//     "ob": [
//     "465.00"
//     ],
//     "oc": [
//     "Beaufort County Magistrate"
//     ]
//     }
//     ]
//     },
//     {
//     "aa": [
//     "Beaufort County Sheriff's Ofc"
//     ],
//     "ao": [
//     "Keener, J"
//     ],
//     "bn": [
//     "    21359"
//     ],
//     "bd": [
//     "07:14:20 04/25/18"
//     ],
//     "rd": [
//     "0"
//     ],
//     "of": [
//     {
//     "os": [
//     "16-17-0725/A"
//     ],
//     "ow": [
//     "2018A0710200118"
//     ],
//     "ol": [
//     "FalseInfo/LEO/reportcrime"
//     ],
//     "ob": [
//     "0.00"
//     ],
//     "oc": [
//     "Beaufort County Magistrate"
//     ]
//     }
//     ]
//     }
//     ]
//     },
/**
 * Search and display recent confinement data.
 *
 * PHP version 5.4.45
 *
 * LICENSE: None.
 *
 * @author      Chris Hessert <chris dot hessert at gmail dot com>
 * @version     Release 0.1.0
 * @since       File available since Release 0.1.0
 */

/*  Declarations  */
$data = array();
$start= -$_GET["start"];
$end = -$_GET["end"];
$sources = array(
	0 => array(
		'agency'	=> 'Beaufort County',
        'url'		=> 'http://mugshots.bcgov.net/booked90.xml'
	)
);
$startTarget = strtotime("$start days 0:0:0", strtotime('now'));
$endTarget = strtotime("$end days 0:0:0", strtotime('now'));

$test = array();
/*  App  */
$i = 0;
foreach ( $sources as $source )
{
	$data[$i]['agency'] = $source['agency'];
    $data[$i]['url'] = $source['url'];
    $data[$i]['success'] = true;
	$xml = simplexml_load_file( $source['url'] );
	$data[$i]['data'] = array();
	$j = 0;
	foreach ( $xml->ins->in as $inmate )
	{
		$booked = date_create_from_format('G:i:s m/d/y', (string) $inmate->bd);
		$timestamp = strtotime( $booked->setTime(0,0,0)->format('Y-m-d H:i:s') );

		// Only process inmates for the date target window.
		if ( $timestamp >= $startTarget && $timestamp <= $endTarget)
		{
            $test[] = $inmate;

			$name_last = (string) $inmate->nl;
			$name_first = (string) $inmate->nf;
			$name_middle = (string) $inmate->nm;

            $data[$i]['data'][$j]['last'] = $name_last;
            $data[$i]['data'][$j]['first'] = $name_first;
            $data[$i]['data'][$j]['middle'] = $name_middle;


			// Address.
			$data[$i]['data'][$j]['city'] = (string) $inmate->csz;

			// Race
			$data[$i]['data'][$j]['race'] = (string) explode(" / ",$inmate->racegen)[0];
            
            // Gender
			$data[$i]['data'][$j]['sex'] = (string) explode(" / ",$inmate->racegen)[1];

			// Date of birth.
            $data[$i]['data'][$j]['dob'] = (string) date("M j, Y", strtotime($inmate->dob));

            // Age.
            $data[$i]['data'][$j]['age'] = (string) $inmate->age;

			// Height.
			$data[$i]['data'][$j]['height'] = (string) $inmate->ht;

			// Weight.
			$data[$i]['data'][$j]['weight'] = (string) $inmate->wt;

			// Mugshot: make sure it's an actual image file.
			$url_mug = (string) $inmate->image1['src'];
			if ( preg_match('/\.(jpeg|jpg|png|gif)$/i', $url_mug) )
			{
				$data[$i]['data'][$j]['photo'] = $url_mug;
			}

            // arrest info
            // is there any?
            if ( array_key_exists("ar", $inmate)) {
                $data[$i]['data'][$j]['arrestinfo'][]['present'] = (boolean) true;
                $data[$i]['data'][$j]['arrestinfo'][] = $inmate->ar;
            
            }
			// Booking number.
			$data[$i]['data'][$j]['booknum'] = (string) $inmate->bn;
            
            // Booking date and time.
			$data[$i]['data'][$j]['booktime'] = (string) date("g:i a, M j, Y",strtotime($inmate->bd));

            // Release date
			$data[$i]['data'][$j]['reldate'] = (string) date("g:i a",strtotime($inmate->tmout)).", ".date("M j, Y",strtotime($inmate->dtout));
            
            // Inmate number.
			$data[$i]['data'][$j]['inmatenum'] = (string) $inmate->nn;

            $j++;
		}
	}
	$i++;
}

// Return data in JSON format.
header('Content-Type: application/json');
echo json_encode( $data );
//echo json_encode($test);
?>