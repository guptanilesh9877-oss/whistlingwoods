/**
 * CELEBRATE CINEMA 2026 — TANISHKA DAY 2 INVITATION & BUS ADVISORY DISPATCHER
 * 
 * Sends Day 2 Free Registration link (https://whistlingwoods.careerbeam.in/c/tanishka)
 * + Official Campus Bus & Shuttle timings to the new batch of prospective delegates.
 */

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Load .env
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
            const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (m && !process.env[m[1]]) {
                let v = m[2] || '';
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
                process.env[m[1]] = v.trim();
            }
        });
    }
} catch(e) {}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Celebrate Cinema <confirmations@careerbeam.in>';
const TANISHKA_URL = 'https://whistlingwoods.careerbeam.in/c/tanishka';
const WHATSAPP_URL = 'https://chat.whatsapp.com/DzA3LRSfW44Ap6viArkjI7';
const LOG_FILE = path.join(__dirname, 'sent_tanishka_day2_log.json');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry');
const isRealSend = args.includes('--send');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1].trim() : null;

const sleep = ms => new Promise(res => setTimeout(res, ms));

function loadSentLog() {
    if (fs.existsSync(LOG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        } catch (e) {}
    }
    return { sent: {}, totalSent: 0, lastUpdated: null };
}

function saveSentLog(log) {
    log.lastUpdated = new Date().toISOString();
    log.totalSent = Object.keys(log.sent).length;
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function cleanEmail(raw) {
    if (!raw) return '';
    let em = String(raw).trim().toLowerCase();
    // Strip markdown formatting like [abc@gmail.com](http://...)
    em = em.replace(/^\[+|\]+$/g, '');
    const m = em.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (m) {
        em = m[1];
    } else {
        // Try fixing missing @ like mdryaan2382gmail.com -> mdryaan2382@gmail.com
        if (em.includes('gmail.com') && !em.includes('@')) {
            em = em.replace('gmail.com', '@gmail.com');
        }
    }
    em = em.replace(/@gamil\.com$/, '@gmail.com');
    em = em.replace(/@gmait\.com$/, '@gmail.com');
    em = em.replace(/@gmaill\.com$/, '@gmail.com');
    em = em.replace(/@gmail\.com0$/, '@gmail.com');
    em = em.replace(/@gmail\.com[a-z0-9]$/, '@gmail.com');
    return em.trim();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
function isValidEmail(em) {
    if (!em || !EMAIL_REGEX.test(em)) return false;
    if (em.includes('dummy') || em.includes('example.com')) return false;
    return true;
}

// RAW INPUT DATA 1: 37 TSV ROWS
const rawTsv = `10/6/2026 18:38:43	arpitakhorwal000@gmail.com	Arpita Khorwal	26	Female	First Day Only	Malad	8824533806	Everymedia Technologies 
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
10/7/2026 18:44:52	siddheshsurvework@gmail.com	Siddhesh Surve	26	Male	Both The Days	Thane	8805552211	Independant`;

// RAW INPUT DATA 2: MULTI-LINE LIST
const rawList2 = `CHIATRAANSH NIGAN
chiatraansh.nigam@ghs.edu.in
8976344168
Gokuldham
Ashutosh Jaiswal
jaiswal.ashutosh1408@gmail.com
8454860065
Gokuldham
Tithi palande
tithipalande2017@gmail.com
7738210969
Gokuldham
dark blue google form
Janhvi Hiranandani
janhvihiranandani5818@gmail.com
8452038954
Mithibhai
FPHR =03
Charvi Dey
charvidey066@gmail.com
8591021382
Gokuldham
HSNC=04
Mohammad Rehan Ansari
rehanchamder@gmail.com
8450947727
HSNC Worli
Mohammad Ryaan Ansari
[mdryaan2382gmail.com](http://mdryaan2382gmail.com/)
7977199028
AIKTC
Sugra Akil Khan
khansugraakil@gmail.com
8924059284
SIWS
Swara Sarpotdar
[swara.sarptdar12082gmail.com](http://swara.sarptdar12082gmail.com/)
9324214413
Gokuldham
Geeta Thakur
aishwarya.thakur19054@gmail.com
8356065439
VES
Hemant Navgire
navgirehemant9@gmail.com
8692856019
Chetna
Swarali Gaikwad
swaraligaikwad825@gmail.com
7822836794
Chetna
Arnav Choudhari
choudariarnav2010@gmail.com
9673699948
DPS Panvel
Krishnendu Gupta
krishnendugupta38@gmail.com
9820120242
DPS Panvel
Dr Amisha Ved
amisha.merchant@chetnacollege.in
8989220265
Chetna clg faculty
Kunjal Solanki
8767037852
Chetna clg faculty
Nishit Barad
baradnishit@gmail.com
9082048009
Raheja
Anjali Lodhi
anjalilodhi00002@gmail.com
7977374518
Chetna
Chaitanya Gonbare
chaitanyagonbare6@gmail.com0
7039004595
Chetna
Piyush Jayprakash Jaiswar
piyushjaiswar77@gmail.com
8652552042
CHetna
Mrunali Rajendra Kadam
mrunalikadam132@gmail.com0
8856921073
Chetna
Neha Parmar
nparmar0916@gmail.com
8369811841
Khalsa college
Jash Jethwa
jashjethwa9@gmail.com
8200818804
DGMC
Lucky Gaydhan
luckygaydhan5@gmail.com
8305662754
Devi Prasad Goenke Media college
Karan Katvi
kdkatvi.dk@gmail.com
8668604656
Devi Prasad Goenke Media college
Himanshu Borikar
haniborikar2006@gmail.com
9359013945
Devi Prasad Goenke Media college
Vaibhav Pagare
vaibhavsp8072@gmail.com
7045577713
Graduate
Bharvi Pandit
bharvipandit21@gmail.com
7039977183
NMIMS
Sanskar Sahu
sanskar890890@gmail.com
9926369093
DGMC
Soloman Raju Jagu
solomanjagu@yahoo.co.in
9833776609
Shubham Shinde
shubhushinde2702@gmail.com
9850966254
Chetna college faculty
ASMITA PANDURANG PAWAR
asmita.pawar.197@gmail.com
9321644460
Sydenham College
Akshay Prajapati
akshay194@gmail.com
987654012
Sydenham College
Yash Andhare Moreshwar
yash199@gmail.com
9856457898
Sydenham College
Mahir Suradkar
mahirsuradkar@gmail.com
8104041897
Sydenham College
Sonali S. Shelke
shelke9372@gmail.com
937213356
Sydenham College
SIDDHI PRASHANT PEDNEKAR
siddhipednekar07@gmail.com
9137311157
Sydenham College
Aasawari Tamhane
aasawari.tamhane@bhartiyavidyapeeth.edu
9869465262
Bhartiyavidyapeeth faculty
Bonoh
papabonoh@gmail.com
9920696292
Gokuldham
Janhavi Kamble
jpkamble09@gmail.com
9820966788
Gokuldham
Gaurav Gorai
gaurav.gorai09@gmail.com
8591702728
Gokuldham
Vihaan Acharya
vihaanacharya0@gmail.com
9136771228
Gokuldham
Sanchit BHalerao
sanchitbhalerao9@gmail.com
7738824171
Gokuldham
Shivam Patil
patilshivam185@gmail.com
8104390349
Gokuldham
Utkarsh Shukla
shuklautkarsh007@gmail.com
8898892388
Graduate
Anand Yadav
ahy298@gmail.com
9320440012
Bharti Vidyapeeth
Siya Soni
sonisiya2504@gmail.com
7021212488
Graduate
kartik Iyer
rupa.kartik@gmail.com
9833385305
Parent
Khan Rukhsar Jalaluddin
khanrukhsar2146@gmail.com
7208261438
Sydenham College
Huda
hudamomin@gmail.com
826382
Sydenham College
SALINA KALU BOGATI
bogatisalina3@gmail.com
9137298096
Sydenham College
Annesha Arun Mondal
annesha594@gmail.com
7557071061
Sydenham College
Aditi Prakash Mali
maliaditi987@gmail.com
7219011682
Sydenham College
Divya Dipak Jambelkar
divyajambelkar@gamil.com
9699040099
Sydenham College
Himanshu Bhati
rihogisa@gmait.com
9045498363
Sydenham College
Siddhi Anant Sawant
siddhissawant2926@gmail.com
8591505378
Sydenham College
MANTESHA RAHIM SHAIKH
mantesharahim12@gmail.com
9321133896
Sydenham College
Mahi Sandesaria
mahi.23sandesaria@gmail.com
7045019569
Sydenham College
Sadanand Das
sadanandas15@gmail.com
9321498416
Sydenham College
RUCHI BIPIN RUKE
ruke.ruch01@gmail.com
9920460531
Sydenham College
Sahil. M. Valmiki
ahilmvalmiki07@gmail.com
7045438559
Sydenham College
Neha. A. Rathod
rnehaakin13@gmail.com
9833014633
Sydenham College
SANIYA PARVEEN
saniyaparveen08@gmail.com
9137894357
Sydenham College
Sagar Sudhir Gaorkar
gaonkarsagar01@gmail.com
9930409218
Sydenham College
DREAM SEMLANI
dreamsemlani2@gmail.com
9022603090
Sydenham College
KANISHKA BARVE
kanishkarbarve@gmail.com
8591056799
Sydenham College
Sabina Jahangirali Lashkar
lashkarsabina541@gmail.com
8828992470
S.I.W.S
Anushka Rajendra Parab
anushkaparab2008@gmail.com
9137393997
S.I.W.S
Ansari Sahina Mo Islam
Sahinaansari742@gmail.com
9082699817
S.I.W.S
Tanvi Sandeep Lanjekar
tanvilanjekar4724@gmail.com
969985567
S.I.W.S
Sarita Satyendra Chaudhary
Saritachaudhary12456@gmail.com
9653810922
S.I.W.S
Sumit Azadbabu Dhakoliya
sumitdhakoliya70@gmail.com
8850047327
S.I.W.S
Sanskriti Ganesh Tambe
Sanskrititambe@gmail.com
8879731896
S.I.W.S
Omkar Wagh
waghomkar666@gmail.com
8104362421
S.I.W.S
Ameya Buty
ameyabuty@gmail.com
9373831333
Unversity of Bristol
Pallavi Srinivasan
pallavi.sreenivasan.bdes2026@atlasskilltech.university
9004349649
Atlas
Jigisha Jain
jigishadoshi@gmail.com
9619179149
Midday
Shubhankar Naik
naik.shubhankar@gmail.com
7506090634
Ignou
Karan Santosh Kumar
karanskmr99@gmail.com
8976594033
Graduate
Atharva Hoshing
atharvahoshing2808@gmail.com
9370496317
Graduate
Ojas khade
ojmusic.dhh@gmail.com
9665448141
Graduate
Shruti Tupkar
tupkarshruti17@gmail.com
9665719855
Bhartiyavidyapeeth
Vijay Kad
vijaykad281@gmail.com
8308315942
vasant dada patil
Ashwin Sawant
ashwinsawant@gmail.com
9619338676
vasant dada patil
Parth Krutarth Pradhan
pradhanparth1624@gmail.com
9665262406
Bhartiyavidyapeeth
Amisha Shinde
amishashinde21@gmail.com
8484804756
Graduate
Dhanshree Gaikwad
dhanashree1341@gmail.com
7506301542
Bhartiya vidyapeeth faculty
Nishtha Upadhyay
nishtha7753@gmail.com
9152591949
Working
Dhanvir Joginder Singh
sdhanvir2@gmail.com
7349932213
HSNC
Yogesh Bhadane
yogeshbhadane12345@gmail.com
9167533959
VJTI
Robin Deep Singh CHeema
robincheema8@gmail.com
7973042107
Working
Shubham Shinde
shubhyashinde1981@gmail.com
8591920806
Model College
Aditya Vishwakarma
adityavishwakarma2020@gmail.com
8104427415
Guest
Ahmed kasar
aahmedkassar62@gmail.com
7738437999
Guest
Kshama Mehta
kshamamehta04@gmail.com
9819816342
University of Bristol
Umera Ansari
ansariumera797@gmail.com
8468056503
SIES
Mrudul
mrudul931@gmail.com
9024378553
JECRC
Anupama
anupama.bagal@bharatividyapeeth.edu
997566273
Ruchira Dahale
ruchira.dahale@bharatividyapeeth.edu
9372886186
Ankush Behera
ankush41behera@gmail.com
73235802213
Passout
Vedanti Patil
8c30.vedantipatil.sgems@gmail.com
8169258728
Kirti College
Prajakta Pardeshi
prajaktapardeshi2006@gmail.com
7738121675
BK Birla
Mudra Gaikar
gaikarmudra5@gmail.com
9867198345
BK BIrla
Prathibha KOri
prathibhakori215@gmaill.com
7045381602
Kirti College
Prachi Gupta
priigupta7@gmail.com
7700945766
Kirti College
Ameya Kotian
ackotian0812@gmail.com
8850214760
Guest
Srushti Bagade
Srushti.bagade0409@gmail.com
8591279854
Kirti College
Prince Gautam
princeg.6g@gmail.com
8856044565
Vasai Vidya vikasani
Sanjeev
sanjeeva2015@gmail.com
9167111637
Guest
Janvi Jha
princeg.6g@gmail.com
8856044565
Vasai Vidya vikasani
Tanisha Srivastava
srivastavatanisha2008@gmail.com
9372575523
MJM
Vaishnavi
vaishnaviray@gmail.com
8298105147
Shraddha Agrawal
shraddha.exist@gmail.com
9981381131
Vaidehi Karande
vaidehikarande16@gmail.com
8591273334
Kirti
Raj Singh Verma
happinessrecipebk@gmail.com
8850064937
Amit Shah
amitshah125225@gmail.com
9890536920
SNDT
Eshanvi Kurvah
kurvah.eshanvi12@gmail.com
9769864282
NM
Amanveer Singh
vagalamanveer@gmail.com
9321397053
Khalsa
Jinal Maisheri
jinalmaisheri7979@gmail.com
9323237979
SIES
Kushal Pandian
kushalstanislausthevar@gmail.com
9136088519
HSNC
Shriya Srivastav
shriya.superd30@gmail.com
9820420894
working
Ashish Gupta
ashishgupta03@gmail.com
9867661885
saraf college
Surbhi Mantri
surbhi@fcitechlabs.com
9172881872
working
Sunaina Yadav
radhesham4078@gmail.com
9136623182
Somaiya College
Musab Ansari
musabansariofficial212005@gmail.com
8591250180
Indian School of Media
Ankit Verma
annkitt.verma@gmail.com
9956629929
Working
Varnika
varnika@fcitechlabs.com
7748845405
Working
Arzoo
arjuchahande3@gmail.com
7498720486
working
Samaksh
samakshgupta228@gmail.com
8766280157
AAFT
Anurag
cloxxmedia@gmail.com
9867467671
Working
Nishka SANDEEP KANANI
NISHKAKANANI@GMAIL.COM
9519511648
SK Somaiya
Ritesh Avinash Mahajan
riteshavinashmahajan@gmail.com
7558364339
Chetna College
Anuveer
anuveersinghrathore@gmail.com
8433900323
Wilson
Shubham Zagade
shubhamzagade12@gmail.com
9653343596
KLE
Raj Rathore
rajrathore63540@gmail.com
8261067982
Indian School of Media
Mayank Gaikwad
g25.mayank.narayangaikwad@gnkhalsa.edu.in
8433817807
Behlul
behlul.kapadia@gmail.com
9321593431
Somaiya College
Shrushti Salunkhe
salunkheshrushthi68@gmail.com
9152132396
KLE
Madhura Shirwale
adityapatil.4784.01@gmail.com
8779423030
KLE
Aniket Kadam
aniketkd2609@gmail.com
9004150140
KLE
Saklain Qureshi
shaguiftaqureshi097@gmail.com
8657195022
KLE
Aditya Patil
anjaliatul42aditya@gmail.com
9321644746
KLE
Samyak Narankar
narankarsamyak@gmail.com
7977078130
KLE
Jiten Choudhary
jitenbradchouhan11@gmail.com
7877467893
JVM MEHTA
Aditya Kharade
adityakharade@gmail.com
7877467893
JVM MEHTA
Aditi Thakur
aditissthakur1108@gmail.com
9653193754
KLE
Yash Gagat
gagatyash297@gmail.com
9867314605
KLE
Sumit Ingole
sumitingole344@gmail.com
9137312198
KLE
Ramesh Chhura
fitramesh8575@gmail.com
9137334578
KLE
Dhanashri Shinde
dhanashrishinde757@gmail.com
7710861964
KLE
Neetaa Chhura
neetaa0904@gmail.com
8779299177
KLE
Ruchita Mane
ruchitasm@gmail.com
9892049423
KLE
Vanshika Choudhary
vanshikapchoudhary2005@gmail.com
7400394677
KC
Simran Mohanty
omgcreatorcorners@gmail.com
8237305082
Creator
Sagar Swami
sagarswamy463@gmail.com
8698822257
Creator
Abigail
abigailnight02@gmail.com
9833551660
Guest
Nirmik
nirmikbhosale.mng@gmail.com
9673671333
NMIMS`;

function extractAllRecipients() {
    const list = [];
    const seen = new Set();

    // 1. Process TSV lines
    rawTsv.split('\n').forEach(line => {
        const parts = line.split('\t').map(s => s.trim());
        if (parts.length >= 3) {
            const email = cleanEmail(parts[1]);
            const name = parts[2];
            const phone = parts[7] || '';
            const college = parts[8] || parts[parts.length - 1] || '';

            if (isValidEmail(email) && !seen.has(email)) {
                seen.add(email);
                list.push({ name: name || 'Delegate', email, phone, college });
            }
        }
    });

    // 2. Process Multi-line rawList2
    const lines = rawList2.split('\n').map(s => s.trim()).filter(Boolean);
    let currentName = '';
    let currentEmail = '';
    let currentPhone = '';
    let currentCollege = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Is this line an email?
        const cleaned = cleanEmail(line);
        if (isValidEmail(cleaned)) {
            currentEmail = cleaned;
            // The previous line was likely the name
            if (i > 0 && !lines[i - 1].includes('@') && !/^\d{7,}$/.test(lines[i - 1].replace(/\D/g, ''))) {
                currentName = lines[i - 1];
            }
            // Check next lines for phone and college
            if (i + 1 < lines.length) {
                const next1 = lines[i + 1];
                if (/^\d{7,}$/.test(next1.replace(/\D/g, ''))) {
                    currentPhone = next1;
                    if (i + 2 < lines.length && !lines[i + 2].includes('@')) {
                        currentCollege = lines[i + 2];
                    }
                } else if (!next1.includes('@')) {
                    currentCollege = next1;
                }
            }

            if (!seen.has(currentEmail)) {
                seen.add(currentEmail);
                list.push({
                    name: currentName || 'Delegate',
                    email: currentEmail,
                    phone: currentPhone,
                    college: currentCollege
                });
            }

            currentName = '';
            currentEmail = '';
            currentPhone = '';
            currentCollege = '';
        }
    }

    return list;
}

function buildEmailHtml(r) {
    const safeName = (r.name || 'Delegate').trim();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Day 2 Free Delegate Pass &amp; Shuttle Bus Access — Celebrate Cinema 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0914; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f0f7; -webkit-font-smoothing: antialiased;">
    <div style="padding: 24px 12px; background-color: #0b0914;">
        <div style="max-width: 620px; margin: 0 auto; background: #140f21; border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.65);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #281442 0%, #110c1c 100%); padding: 34px 24px 28px; text-align: center; border-bottom: 2px solid #d4a843;">
                <div style="display: inline-block; background: rgba(212, 168, 67, 0.18); color: #f7e7c5; border: 1px solid #d4a843; border-radius: 20px; padding: 4px 16px; font-size: 11.5px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px;">
                    🎬 Day 2 Invitation • Today, 09th October
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 6px; letter-spacing: 0.5px; line-height: 1.3;">
                    Celebrate Cinema 2026
                </h1>
                <p style="color: #d4a843; font-size: 14px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">
                    Whistling Woods International • Film City, Mumbai
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 28px 24px; line-height: 1.6; color: #d6cee3; font-size: 14.5px;">
                <p style="margin: 0 0 14px; font-size: 16px;">Dear <strong style="color: #ffffff;">${safeName}</strong>,</p>
                
                <p style="margin: 0 0 16px;">
                    We are thrilled to invite you to <strong>Day 2 of Celebrate Cinema 2026</strong> at <strong>Whistling Woods International (Film City)</strong> happening today!
                </p>

                <p style="margin: 0 0 20px;">
                    Under our special campus collaboration, you have been granted an exclusive <strong style="color: #4ade80;">100% Free Delegate Pass</strong> (₹150 fee completely waived). Simply complete your 30-second free pass claim below to receive your instant digital entry QR pass:
                </p>

                <!-- Free Pass CTA Box -->
                <div style="background: linear-gradient(135deg, rgba(37, 26, 60, 0.95), rgba(19, 15, 33, 0.95)); border: 1.5px solid #d4a843; border-radius: 12px; padding: 24px 20px; text-align: center; margin: 24px 0; box-shadow: 0 6px 20px rgba(212, 168, 67, 0.15);">
                    <div style="font-size: 12px; font-weight: 700; color: #d4a843; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                        ★ Exclusive Free Registration Link ★
                    </div>
                    <h3 style="color: #ffffff; margin: 0 0 14px; font-size: 19px;">
                        Claim Your Day 2 Free Pass Now
                    </h3>
                    <p style="margin: 0 0 18px; font-size: 13px; color: #c4a8e2;">
                        Click the button below to confirm your details and download your Gate Boarding Pass:
                    </p>
                    <a href="${TANISHKA_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4a843 0%, #b8860b 100%); color: #0b0914 !important; font-weight: 800; font-size: 15px; padding: 14px 34px; border-radius: 30px; text-decoration: none; box-shadow: 0 4px 16px rgba(212, 168, 67, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                        👉 Click Here to Register for Day 2 (Free)
                    </a>
                    <div style="margin-top: 14px; font-size: 12px; color: #a69bb5;">
                        Direct Link: <a href="${TANISHKA_URL}" style="color: #d4a843; word-break: break-all; text-decoration: underline;">${TANISHKA_URL}</a>
                    </div>
                </div>

                <!-- Bus Shuttle Schedule & Pickup Location -->
                <div style="background: rgba(26, 20, 42, 0.85); border: 1px solid rgba(212, 168, 67, 0.4); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <div style="font-size: 14px; font-weight: 800; color: #d4a843; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px;">
                        🚌 Important Bus &amp; Shuttle Information
                    </div>
                    
                    <div style="background: rgba(212, 168, 67, 0.12); border-left: 4px solid #d4a843; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px;">
                        <div style="font-size: 11.5px; font-weight: 700; color: #d4a843; text-transform: uppercase;">📍 Pickup Point:</div>
                        <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-top: 2px;">
                            McDonald’s, Bata, Goregaon East
                        </div>
                        <div style="font-size: 12.5px; color: #e9d5ff; margin-top: 2px;">
                            (Near Goregaon Railway Station East exit)
                        </div>
                    </div>

                    <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                        <div style="font-size: 13px; font-weight: 800; color: #4ade80; margin-bottom: 4px;">
                            ⏰ Morning Shuttle (To Campus):
                        </div>
                        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #e9d5ff; line-height: 1.6;">
                            <li>Students should reach the pickup point by <strong>7:15 AM</strong>.</li>
                            <li>The first bus will leave at <strong>7:30 AM sharp</strong>.</li>
                            <li>Buses will operate continuously from <strong>7:30 AM to 1:00 PM</strong>.</li>
                        </ul>
                    </div>

                    <div>
                        <div style="font-size: 13px; font-weight: 800; color: #f59e0b; margin-bottom: 4px;">
                            🔄 Return Shuttle (Back to Station):
                        </div>
                        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #e9d5ff; line-height: 1.6;">
                            <li>Return buses will operate from <strong>4:30 PM to 6:00 PM</strong>.</li>
                            <li><strong>6:00 PM will be the last bus</strong> leaving from campus.</li>
                        </ul>
                    </div>
                </div>

                <!-- WhatsApp Community CTA -->
                <div style="text-align: center; margin: 24px 0; background: rgba(37, 211, 102, 0.12); border: 2px dashed #25D366; border-radius: 12px; padding: 22px 18px;">
                    <h4 style="color: #ffffff; margin: 0 0 6px; font-size: 16px; font-weight: 800;">
                        📲 Join Official WhatsApp Group for Live Bus Updates
                    </h4>
                    <p style="margin: 0 0 16px; font-size: 13px; color: #a7f3d0; line-height: 1.5;">
                        Get real-time shuttle alerts, bus departure times, and live assistance:
                    </p>
                    <a href="${WHATSAPP_URL}" target="_blank" style="display: inline-block; background: #25D366; color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 12px 30px; border-radius: 30px; text-decoration: none; box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                        👉 Join WhatsApp Group
                    </a>
                </div>

                <p style="margin: 0 0 18px; font-size: 15px; color: #ffffff; font-weight: 700;">
                    We look forward to welcoming you to Whistling Woods International today! 🎬✨
                </p>

                <!-- Signoff -->
                <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 13px; color: #b8acc9;">
                    Warm regards,<br>
                    <strong style="color: #ffffff;">Team Celebrate Cinema 2026</strong><br>
                    <span style="color: #d4a843;">Whistling Woods International &amp; CareerBeam</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #0b0914; padding: 16px 20px; text-align: center; font-size: 11px; color: #736882; border-top: 1px solid rgba(255, 255, 255, 0.06);">
                <p style="margin: 0 0 4px;">Whistling Woods International, Film City Complex, Goregaon (East), Mumbai - 400065</p>
                <p style="margin: 0;">Powered by CareerBeam (<a href="https://careerbeam.in" style="color: #d4a843; text-decoration: none;">careerbeam.in</a>)</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function buildEmailText(r) {
    const safeName = (r.name || 'Delegate').trim();

    return `Dear ${safeName},

CELEBRATE CINEMA 2026 — DAY 2 INVITATION & BUS ADVISORY 🎬
Whistling Woods International (Film City, Mumbai)

We are thrilled to invite you to Day 2 of Celebrate Cinema 2026 happening today!

🎟️ 100% FREE DAY 2 PASS REGISTRATION:
Claim your free pass in 30 seconds (₹150 fee completely waived):
${TANISHKA_URL}

🚌 IMPORTANT BUS & SHUTTLE INFORMATION:
📍 Pickup Point: McDonald’s, Bata, Goregaon East (near Goregaon Railway Station)

⏰ Morning Shuttle:
• Students should reach the pickup point by 7:15 AM.
• The first bus will leave at 7:30 AM sharp.
• Buses will operate from 7:30 AM to 1:00 PM.

🔄 Return Shuttle:
• Return buses will operate from 4:30 PM to 6:00 PM.
• 6:00 PM will be the last bus.

📲 JOIN OFFICIAL WHATSAPP GROUP:
${WHATSAPP_URL}

See you on campus today at Film City!

Warm regards,
Team Celebrate Cinema 2026
Whistling Woods International & CareerBeam`;
}

(async () => {
    console.log('\n================================================================');
    console.log('   CELEBRATE CINEMA 2026 — TANISHKA DAY 2 & BUS ADVISORY BLAST   ');
    console.log('================================================================\n');

    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    const sentLog = loadSentLog();

    const recipients = extractAllRecipients();
    console.log(`✓ Extracted ${recipients.length} valid unique delegate recipients from input!`);

    if (testEmail) {
        console.log(`🧪 TEST MODE ACTIVATED for: ${testEmail}`);
        const sample = recipients[0] || { name: 'Test Delegate', email: testEmail };
        sample.email = testEmail;

        const html = buildEmailHtml(sample);
        const text = buildEmailText(sample);
        const subject = 'Important: Day 2 Free Pass & Bus Information – Celebrate Cinema 2026 🚌';

        if (isDryRun) {
            console.log('DRY RUN: Subject:', subject);
            console.log('DRY RUN: Target:', testEmail);
            console.log('DRY RUN: Free Pass URL:', TANISHKA_URL);
            return;
        }

        try {
            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: testEmail,
                subject: subject,
                html: html,
                text: text
            });
            console.log('✓ Test email sent! ID:', resp.data?.id || resp);
        } catch(e) {
            console.error('❌ Error sending test email:', e.message);
        }
        return;
    }

    // Filter pending
    const pending = recipients.filter(r => !sentLog.sent || !sentLog.sent[r.email.toLowerCase()]);
    console.log(`✓ Already sent previously: ${recipients.length - pending.length}`);
    console.log(`✓ Pending to send now: ${pending.length}\n`);

    if (isDryRun) {
        console.log('🔎 DRY RUN RECIPIENT PREVIEW:');
        pending.slice(0, 10).forEach((r, idx) => {
            console.log(`  ${idx + 1}. ${r.name} <${r.email}> (${r.college || 'Direct'}) - ${r.phone || 'No Phone'}`);
        });
        console.log(`\nTo execute live blast, run: node send_tanishka_day2_invite.js --send`);
        return;
    }

    if (!isRealSend) {
        console.log('⚠️ Please specify --send to trigger actual blast, or --dry for preview.');
        return;
    }

    console.log(`🚀 Starting dispatch to ${pending.length} delegates...`);
    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i++) {
        const r = pending[i];
        const em = r.email.toLowerCase();

        try {
            const html = buildEmailHtml(r);
            const text = buildEmailText(r);
            const subject = 'Important: Day 2 Free Pass & Bus Information – Celebrate Cinema 2026 🚌';

            const resp = await resend.emails.send({
                from: FROM_EMAIL,
                to: em,
                subject: subject,
                html: html,
                text: text
            });

            if (resp.error) {
                console.error(`[${i + 1}/${pending.length}] ❌ ${r.name} (${em}): ${resp.error.message}`);
                failCount++;
            } else {
                console.log(`[${i + 1}/${pending.length}] ✓ OK: ${r.name} (${em}) -> ${resp.data?.id}`);
                sentLog.sent[em] = {
                    name: r.name,
                    phone: r.phone,
                    college: r.college,
                    timestamp: new Date().toISOString(),
                    resendId: resp.data?.id
                };
                okCount++;
            }
        } catch(e) {
            console.error(`[${i + 1}/${pending.length}] ❌ Exception ${r.name} (${em}): ${e.message}`);
            failCount++;
        }

        saveSentLog(sentLog);
        await sleep(140);
    }

    console.log('\n================================================================');
    console.log(`🎉 TANISHKA DAY 2 DISPATCH COMPLETE!`);
    console.log(`  - Successfully sent: ${okCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - Total in log: ${Object.keys(sentLog.sent).length}`);
    console.log('================================================================\n');
})();
