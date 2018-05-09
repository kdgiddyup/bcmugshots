<?php

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
$days = -7;
$sources = array(
	0 => array(
		'agency'	=> 'Beaufort County',
		'url'		=> 'http://mugshots.bcgov.net/jailrosterb.xml'
	)
);
$target = strtotime("$days days", strtotime('now'));


/*  App  */
$i = 0;
foreach ( $sources as $source )
{
	$data[$i]['agency'] = $source['agency'];
	$data[$i]['url'] = $source['url'];
	$xml = simplexml_load_file( $source['url'] );
	$data[$i]['inmates'] = array();
	$j = 0;
	foreach ( $xml->ins->in as $inmate )
	{
		$booked = date_create_from_format('G:i:s m/d/y', (string) $inmate->bd);
		$timestamp = strtotime( $booked->format('Y-m-d H:i:s') );

		// Only process inmates for the date target window.
		if ( $timestamp > $target )
		{
			// Name.
			$name_last = (string) $inmate->nl;
			$name_first = (string) $inmate->nf;
			$name_middle = (string) $inmate->nm;
			$name = "$name_first";
			if ( strlen($name_middle) > 0 )
			{
				$name .= " $name_middle";
			}
			$name .= " $name_last";
			$data[$i]['inmates'][$j]['name'] = $name;

			// Address.
			$data[$i]['inmates'][$j]['street'] = (string) $inmate->street;
			$data[$i]['inmates'][$j]['csz'] = (string) $inmate->csz;

			// Race/gender.
			$data[$i]['inmates'][$j]['race_gender'] = (string) $inmate->racegen;

			// Date of birth.
            $data[$i]['inmates'][$j]['dob'] = (string) $inmate->dob;

			// Date booked.
			$data[$i]['inmates'][$j]['booked'] = $booked->format('m/d/y g:i A');

			// Height.
			$data[$i]['inmates'][$j]['height'] = (string) $inmate->ht;

			// Weight.
			$data[$i]['inmates'][$j]['weight'] = (string) $inmate->wt;

			// Mugshot: make sure it's an actual image file.
			$url_mug = (string) $inmate->image1['src'];
			if ( preg_match('/\.(jpeg|jpg|png|gif)$/i', $url_mug) )
			{
				$data[$i]['inmates'][$j]['thumbnail'] = $url_mug;
			}

			// Booking number.
			$data[$i]['inmates'][$j]['booking_number'] = (string) $inmate->bn;

			// Arresting agency.
			$data[$i]['inmates'][$j]['arresting_agency'] = (string) $inmate->ar->aa;

			// Arresting officer.
			$data[$i]['inmates'][$j]['arresting_officer'] = (string) $inmate->ar->ao;

			// Offenses.
			$k = 0;
			foreach ( $inmate->ar->of as $offense )
			{
				$data[$i]['inmates'][$j]['offenses'][$k]['statute'] = (string) $offense->os;
				$data[$i]['inmates'][$j]['offenses'][$k]['offense'] = (string) $offense->ol;
				$data[$i]['inmates'][$j]['offenses'][$k]['court'] = (string) $offense->oc;
				$data[$i]['inmates'][$j]['offenses'][$k]['warrant'] = (string) $offense->ow;
				$data[$i]['inmates'][$j]['offenses'][$k]['bond'] = (string) $offense->ob;
				$k++;
			}
			$j++;
		}
	}
	$i++;
}

// Return data in JSON format.
header('Content-Type: application/json');
echo json_encode( $data );

?>