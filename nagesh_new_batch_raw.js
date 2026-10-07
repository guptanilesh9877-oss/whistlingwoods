const rawTsv = `Timestamp	Email address	Your full name	Enter your age	Your Gender	Which days are you going to visit on?	Where do you live? (Example- Andheri West)	Enter Your Mobile Number	Enter the full Name of your college where you study / or enter the name of the institution where you work.	
10/6/2026 18:38:43	arpitakhorwal000@gmail.com	Arpita Khorwal	26	Female	First Day Only	Malad	8824533806	Everymedia Technologies 	
10/6/2026 20:08:01	jiya.collegee@gmail.com	Jiya Parekh	19	Female	Both The Days	Dahisar	7208071020	Dj Sanghvi college of engineering 	
10/6/2026 20:46:26	sukannya2709@gmail.com	Sukannya Ball	24	Female	Both The Days	Mira road East 	9619247368	Freelancer 	
10/6/2026 20:47:24	iamnehal2006@gmail.com	Nehal Gohil 	20	Female	Second Day Only	Virar west	7620074583	 Le mark institute 	
10/6/2026 20:48:15	sumedh192008@gmail.com	Sumedh Shinde 	18	Male	Second Day Only	Thane west	9004523948	Le mark Institute, valia college, dn nagar. Andheri west	
10/6/2026 21:03:58	aachalsonawane0@gmail.com	Aachal Bhushan Sonawane	23	Female	Second Day Only	Dadar	9324430535	Dg Ruparel College	
10/6/2026 21:15:09	pncrajgariha@gmail.com	Priyanshi Rajgariha 	24	Female	Both The Days	Goregaon	6204199243	Freelance cinematographer 	
10/6/2026 21:20:15	arpitachavhan953@gmail.com	Soham hemant kumar chavan	18	Male	Both The Days	Kopar east	9152694838	Keraleeya Samajam (Regd.) Dombivli's Model College (Autonomous).	
10/6/2026 21:22:59	vedantsawant674@gmail.com	Vedant Abhijit Sawant 	18	Male	Both The Days	Ulhasnagar west 	9699877975	Keraleeya Samajam (Regd.) Dombivli's Model College 	
10/6/2026 21:25:39	shreyasharmaji2908@gmail.com	Shreya Sharma 	17	Female	Both The Days	Dombivli East 	9769078930	Keraleeya samajam (Regd.) model college 	
10/6/2026 21:38:01	thakurparmeet782@gmail.com	Parmeet Thakur	21	Male	Both The Days	Andheri west	9892678234	Mumbai university 	
10/6/2026 22:48:57	sangamsingh1352002@gmail.com	Sangam Singh 	24	Male	Both The Days	Four bunglows 	8534074346	NMIMS 	
10/6/2026 22:49:36	alefiyak24@gmail.com	Alefiya Kapadia 	19	Female	Second Day Only	Mazgoan 	7977380652	H.R College Of Commerce and Economics 	
10/6/2026 23:02:51	itzluckyyadavv@gmail.com	Lucky Yadav	19 years	Male	Both The Days	Goregaon East	8850354202	Thakur College of Science and Commerce and I am also an Actor	
10/6/2026 23:39:10	tanushreepjadhav@gmail.com	Tanushree Jadhav	21	Female	Second Day Only	Goregao west	9930921918	Jiostar 	
10/7/2026 1:02:00	eshanikidesai@gmail.com	Esha Desai	24	Female	Second Day Only	Khar West 	9819145688	HBTMC Cooper Medical College 	
10/7/2026 1:46:02	suhani.veena1903@gmail.com	Suhani Bahuguni 	21	Female	Both The Days	Mira road East	8591219274	SIES college Sion West 	
10/7/2026 3:20:00	akshatsarda06@gmail.com	AKSHAT SARDA 	21	Male	Both The Days	Kandivali East 	9325286515	TCET	
10/7/2026 3:32:33	dummymail1301@gmail.com	Pushkar	21	Male	Both The Days	Kandivali East 	9322675740	Thakur college	
10/7/2026 8:46:14	omkart526@gmail.com	Omkar Tripathi 	18	Male	First Day Only	Flat no 203 building no 5 near patharli Dombivli East 	8108317288	Model college 	
10/7/2026 9:28:23	rc428688@gmail.com	Ritu Chaudhary 	21	Female	First Day Only	Dombivli	8452898896	Model college	
10/7/2026 9:51:11	agastyapatnaik18@gmail.com	Agastya Patnaik	19	Male	Both The Days	Dahisar West	9938196829	IIT GUWAHATI 	
10/7/2026 10:55:51	subham.gantagharia.iit@gmail.com	Subham Gantagharia 	30	Male	Both The Days	Andheri West 	9325420868	National Dairy Research Institute 	
10/7/2026 11:05:27	moinbolatar78@gmail.com	Bolatar moin	25	Male	Both The Days	Andheri west	9638248192	M social	
10/7/2026 11:19:40	jenniferirani18@gmail.com	Jennifer Irani 	20	Female	Both The Days	Worli	97308 75521 	Hassaram Rijhumal College of Commerce and Economics	
10/7/2026 12:09:35	drushtirane60585@gmail.com	Drushti Rane	20	Female	Both The Days	Kandivali (w)	8104135301	Rizvi college of arts, science and commerce 	
10/7/2026 13:15:54	rsoham073@gmail.com	Soham Balkrishna Rane	19	Male	Both The Days	Thane	7304723856	Terna Engineering college 	
10/7/2026 13:46:06	kp9421790@gmail.com	Khushi Parmar	16	Female	Second Day Only	Parel 	8082499970	Hinduja college of commerce 	
10/7/2026 13:57:01	mahibjain2009@gmail.com	mahi jain	16	Female	Both The Days	lalbuag 	9819669339	K.P.B HINDUJA COLLEGE OF COMMERECE	
10/7/2026 14:03:18	reignhouse41@gmail.com	Sammyak Rajesh Mohite	18	Male	Both The Days	Vasai East 	7263882606	The Institute of Science 	
10/7/2026 14:44:10	vrishtikanungo@gmail.com	Vrishti Kanungo 	20	Female	Both The Days	South Mumbai	9892549006	H R. College of commerce and economics 	
10/7/2026 14:54:44	jainipatel3405@gmail.com	Jaini patel	20	Female	Second Day Only	Mira rd 	9321322908	Nagindas kandawal college 	
10/7/2026 14:57:21	vrushtim173@gmail.com	Vrushti Vipul Mehta 	20	Female	Second Day Only	Bhayandar (west)	9619956145/ 9653419289	Nagindas khandwala college 	
10/7/2026 14:59:09	siyastudiesss@gmail.com	Saanjh M	19	Female	Both The Days	Malad	9082179139	Mumbai University - ACE	
10/7/2026 15:40:03	asifkhankayoomkhan98@gmail.com	Asif kayoom khan	18	Male	Both The Days	Dharvi siom	9152458295	Khalsa college	
10/7/2026 16:05:46	workofanuj@gmail.com	Anuj ravindra kamble 	21	Male	Both The Days	Andheri east	9619393783	Kuku fm 	
10/7/2026 18:44:52	siddheshsurvework@gmail.com	Siddhesh Surve	26	Male	Both The Days	Thane	8805552211	Independant	`;

module.exports = { rawTsv };
