<?php

/**
 * Search and display recent confinement data.
 *
 *
 *
 * LICENSE: None.
 *
 * @author      Kelly Davis <kellydavis1974 at gmail dot com> adapted from original 
 *              by Chris Hessert <chris dot hessert at gmail dot com>
 * @version     Release 2.0
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

/* debug */
//$test = array();

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
			$data[$i]['data'][$j]['reldate'] = ($inmate->dtout == "Confined") ? (string) "Confined" : (string) date("g:i a",strtotime($inmate->tmout)).", ".date("M j, Y",strtotime($inmate->dtout));
            
            // Inmate number.
			$data[$i]['data'][$j]['inmatenum'] = (string) $inmate->nn;

            $j++;
		}
	}
	$i++;
}

// Return data in JSON format.
header('Content-Type: application/json');
echo json_encode( $data[0] );
/* debug */
//echo json_encode( $test );
?>