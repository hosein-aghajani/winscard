Cu.import('resource://gre/modules/ctypes.jsm');


var CONF = {
    is64bit: ctypes.voidptr_t.size == 4 ? false : true,
    ifdef_UNICODE: true};
var TYPES = {

    CHAR: ctypes.char,
    DWORD: ctypes.uint32_t,
    LONG: ctypes.long,
    LPCVOID: ctypes.voidptr_t,

    WCHAR: ctypes.char16_t,//ctypes.jschar,//
    BYTE: ctypes.unsigned_char //ctypes.uint8_t
};
TYPES.ABI = CONF.is64bit ? ctypes.default_abi : ctypes.winapi_abi;
TYPES.CALLBACK_ABI = CONF.is64bit ? ctypes.default_abi : ctypes.stdcall_cabi;
TYPES.ULONG_PTR= CONF.is64bit ? ctypes.uint64_t : ctypes.unsigned_long;
// advanced types - based on simple types
TYPES.LPSTR = TYPES.CHAR.ptr;
TYPES.LPCSTR = TYPES.CHAR.ptr;
TYPES.LPDWORD = TYPES.DWORD.ptr;
TYPES.LPCWSTR = TYPES.WCHAR.ptr;
TYPES.LPWSTR = TYPES.WCHAR.ptr;
TYPES.SCARDCONTEXT = TYPES.ULONG_PTR;
TYPES.SCARDHANDLE = TYPES.ULONG_PTR;
TYPES.LPBYTE = TYPES.BYTE.ptr;//ctypes.wintypes.BYTE.ptr;//TYPES.LPSTR;//ctypes.create_string_buffer(32);//TYPES.BYTE.ptr;

// advanced advanced types - based on advanced types
TYPES.LPCTSTR = CONF.ifdef_UNICODE ? TYPES.LPCWSTR : TYPES.LPCSTR;
TYPES.LPTSTR = CONF.ifdef_UNICODE ? TYPES.LPWSTR : TYPES.LPSTR;
TYPES.PSCARDCONTEXT = TYPES.SCARDCONTEXT.ptr;
TYPES.LPSCARDCONTEXT = TYPES.SCARDCONTEXT.ptr;
TYPES.LPSCARDHANDLE = TYPES.SCARDHANDLE.ptr;

var CONST = {
    SCARD_AUTOALLOCATE: TYPES.DWORD('0xffffffff'),
    SCARD_SCOPE_SYSTEM: 2,
    SCARD_SCOPE_USER: 0,
    SCARD_S_SUCCESS: 0,
    SCARD_SHARE_SHARED: 2,
    SCARD_PROTOCOL_T0: 0x00000000,//An asynchronous, character-oriented half-duplex transmission protocol
    SCARD_PROTOCOL_T1: 0x00000001,//An asynchronous, block-oriented  half-duplex transmission protocol
    SCARD_IO_REQUEST : new ctypes.StructType("myStruct" ,
                                             [{"dwProtocol": TYPES.DWORD},
                                              {"cbPciLength": TYPES.DWORD}])

};



var hContext =  TYPES.SCARDCONTEXT;
var reader_count = TYPES.DWORD();			
var names = "";
//var reader_names = TYPES.LPCTSTR;
var cardHandle  = TYPES.SCARDHANDLE();		
var AProtocol = TYPES.DWORD();


var cardLib = ctypes.open('Winscard');
var SCardEstablishContext = cardLib.declare('SCardEstablishContext', TYPES.ABI, TYPES.DWORD, TYPES.DWORD, TYPES.LPCVOID, TYPES.LPCVOID, TYPES.LPSCARDCONTEXT);
var SCardListReaders = cardLib.declare(CONF.ifdef_UNICODE ? 'SCardListReadersW' : 'SCardListReadersA', TYPES.ABI, TYPES.LONG, TYPES.SCARDCONTEXT, TYPES.LPCTSTR, TYPES.LPTSTR, TYPES.LPDWORD);
var SCardConnect = cardLib.declare(CONF.ifdef_UNICODE ? 'SCardConnectW' : 'SCardConnectA', TYPES.ABI, TYPES.LONG, TYPES.SCARDCONTEXT, TYPES.LPCTSTR, TYPES.DWORD,TYPES.DWORD,TYPES.LPSCARDHANDLE, TYPES.LPDWORD);
var SCardBeginTransaction = cardLib.declare('SCardBeginTransaction', TYPES.ABI, TYPES.LONG, TYPES.SCARDHANDLE);
var SCardStatus = cardLib.declare(CONF.ifdef_UNICODE ? 'SCardStatusW' : 'SCardStatusA', TYPES.ABI, TYPES.LONG, TYPES.SCARDHANDLE, TYPES.LPTSTR, TYPES.LPDWORD, TYPES.LPDWORD, TYPES.LPDWORD, TYPES.LPBYTE, TYPES.LPDWORD);
var SCardTransmit = cardLib.declare('SCardTransmit', TYPES.ABI, TYPES.LONG, TYPES.SCARDHANDLE, CONST.SCARD_IO_REQUEST.ptr, TYPES.LPBYTE, TYPES.DWORD, CONST.SCARD_IO_REQUEST.ptr, TYPES.LPBYTE, TYPES.LPDWORD);
var SCardFreeMemory = cardLib.declare('SCardFreeMemory', TYPES.ABI, TYPES.LONG, TYPES.SCARDCONTEXT, TYPES.LPCVOID);
var SCardReleaseContext = cardLib.declare('SCardReleaseContext', TYPES.ABI, TYPES.LONG, TYPES.SCARDCONTEXT);

/*var myExtension =
    {


        myListner:function(evt)
        {
            alert("recieved from web page:" +
                  evt.target.getAttribute("attribute1") + "/" +
                  evt.target.getAttribute("attribute2"));
            evt.target.setAttribute("attribute3","bye");
            var doc = evt.target.ownerDocument;
            var AnswerEvt = doc.createElement("MyExtensionAnswer");
            doc.documentElement.appendChild(AnswerEvt);
            var event = doc.createEvent("HTMLEvents");
            event.initEvent("MyAnswerEvent",true,false);
            AnswerEvt.dispatchEvent(event);
        }


    }*/
var myExtension1 =
    {


        SCardEstablishContext:function(evt)
        {
            //alert("recieved from web page: Starting SCardEstablishContext");
            var hSC = TYPES.SCARDCONTEXT();
            var rez_SCEC = SCardEstablishContext(CONST.SCARD_SCOPE_SYSTEM, null, null, hSC.address());
            if (rez_SCEC.toString() != CONST.SCARD_S_SUCCESS.toString()) {
                console.error('failed to establish context! error code was: ' + rez_SCEC + ' in other terms it is: 0x' + rez_SCEC.toString(16) + ' you can look up this error value here: https://msdn.microsoft.com/en-us/library/windows/desktop/aa374738%28v=vs.85%29.aspx#smart_card_return_values');
                throw new Error('failed to establish context!');
            }

            //var reader_count = TYPES.DWORD();				
            var rez_SCLR = SCardListReaders(hSC, null, null, reader_count.address());


            // console.log('rez_SCLR:', rez_SCLR, rez_SCLR.toString());
            if (rez_SCLR.toString() != CONST.SCARD_S_SUCCESS.toString()) {
                console.error('failed to get list of readers! error code was: ' + rez_SCLR + ' in other terms it is: 0x' + rez_SCLR.toString(16) + ' you can look up this error value here: https://msdn.microsoft.com/en-us/library/windows/desktop/aa374738%28v=vs.85%29.aspx#smart_card_return_values');
                throw new Error('failed to get list of readers!');
            } 

            // console.log('parseInt(reader_count.value):', parseInt(reader_count.value));

            var reader_names = TYPES.LPTSTR.targetType.array(parseInt(reader_count.value))();
            // console.log('reader_names.toString()', reader_names.toString());
            // console.log('reader_names.address().toString()', reader_names.address().toString());

            var rez_SCLR = SCardListReaders(hSC, null, reader_names, reader_count.address());
            //console.log('rez_SCLR:', rez_SCLR, rez_SCLR.toString());
            if (rez_SCLR.toString() != CONST.SCARD_S_SUCCESS.toString()) {
                console.error('failed to get list of readers! error code was: ' + rez_SCLR + ' in other terms it is: 0x' + rez_SCLR.toString(16) + ' you can look up this error value here: https://msdn.microsoft.com/en-us/library/windows/desktop/aa374738%28v=vs.85%29.aspx#smart_card_return_values');
                throw new Error('failed to get list of readers!');
            }
            // console.error('reader_names.toString()', reader_names.toString());

            names = "";
            for(i =0; i < reader_names.length; i++)
            {
                names = names + reader_names[i];
            } 
            names = names.replace('\x00\x00','');
            names = names.replace('\x00',';');
            // alert("recieved from web page:");
            evt.target.setAttribute("reader_names", reader_names);
            evt.target.setAttribute("HContext",hSC);
            var doc = evt.target.ownerDocument;
            var AnswerEvt = doc.createElement("SCardEstablishContext");
            doc.documentElement.appendChild(AnswerEvt);
            var event = doc.createEvent("HTMLEvents");
            event.initEvent("SCardEstablishContextEvent",true,false);
            AnswerEvt.dispatchEvent(event);

            hContext = hSC;
        }


    }

var myExtension2 =
    {


        Connect:function(evt)
        {
            try
            {
                //var selectedReader = ctypes.cast(ctypes.char16_t.array()(names), TYPES.LPTSTR);
                //var selectedReader = ctypes.char16_t.array()(names);
                //var selectedReader = reader_names;
                var selectedReader = TYPES.LPTSTR.targetType.array(parseInt(reader_count.value))(names);
                //var selectedReader = TYPES.LPCTSTR (reader_names);
                // alert("I am Connect");

               // alert(names);
                //var selectedReader = (evt.target.getAttribute("reader_names"));

                //var cardHandle  = TYPES.SCARDHANDLE();			
                //var AProtocol = TYPES.DWORD();
                var context= hContext;//TYPES.SCARDCONTEXT(evt.target.getAttribute("HContext"));
               // alert(context.toString());

                var rez_SCC = SCardConnect(context, selectedReader , CONST.SCARD_SHARE_SHARED, CONST.SCARD_PROTOCOL_T0|CONST.SCARD_PROTOCOL_T1, cardHandle.address(), AProtocol.address());

                console.log('rez_SCC:', rez_SCC, rez_SCC.toString());
                if (rez_SCC.toString() != CONST.SCARD_S_SUCCESS.toString()) {
                    console.error('failed to connect to card, error code was: ' + rez_SCC + ' in other terms it is: 0x' + rez_SCC.toString(16) + ' you can look up this error value here: https://msdn.microsoft.com/en-us/library/windows/desktop/aa374738%28v=vs.85%29.aspx#smart_card_return_values');
                    throw new Error('failed to connect to card!');
                }
               // alert("hi" + cardHandle.toString());
                // console.error('cardhandel.toString()', cardHandle.toString());
                //  alert(rez_SCC.toString());
                evt.target.setAttribute("CardHandle",cardHandle.toString());
                var doc = evt.target.ownerDocument;
                var AnswerEvt = doc.createElement("Connect");
                doc.documentElement.appendChild(AnswerEvt);
                var event = doc.createEvent("HTMLEvents");
                event.initEvent("ConnectEvent",true,false);
                AnswerEvt.dispatchEvent(event);
            }
            catch(e)
            {
               // alert(e.message);
            }

        }


    }


function hex2Dec(hex)//split string byte to byte then convert each two hex number to decimal
{
    var result = new Array();
    var j = 0;
    var n, m;
    myHex = hex.replace(/ /gi, "");
    if((myHex.length % 2) != 0)
        myHex = "0" + myHex;
    for(i = 0; i < myHex.length; i+=2){
        tempHex = myHex.substring(i, i+2);
        m = tempHex[0].toLowerCase();
        n = tempHex[1].toLowerCase();

        if(m == "a")
            m = 10;
        else if(m == "b")
            m = 11;
        else if(m == "c")
            m = 12;
        else if(m == "d")
            m = 13;
        else if(m == "e")
            m = 14;
        else if(m == "f")
            m = 15;
        if(n == "a")
            n = 10;
        else if(n == "b")
            n = 11;
        else if(n == "c")
            n = 12;
        else if(n == "d")
            n = 13;
        else if(n == "e")
            n = 14;
        else if(n == "f")
            n = 15;

        result[j] = (m*16) + (n*1);
        j++;
    }
    return result;
}

function dec2Hex(dec)
{
    tempDec = dec;
    var result = "";
    while(tempDec >= 16){
        r = (tempDec % 16);
        if(r == 10)
            result = "a" + result;
        else if(r == 11)
            result = "b" + result;
        else if(r == 12)
            result = "c" + result;
        else if(r == 13)
            result = "d" + result;
        else if(r == 14)
            result = "e" + result;
        else if(r == 15)
            result = "f" + result;
        else
            result = (tempDec % 16) + result;
        tempDec = Math.floor(tempDec / 16);
    }
    result = tempDec + result;
    return result;
}


var myExtension3 = 
    {

        Transmit : function(evt)/*(SCardTransmit, hCard, AProtocol)*/{
            try{
                var myArr = hex2Dec(evt.target.getAttribute("command"));        
                //var myArr = hex2Dec("00a4 040010a0000 0001830030100 0000000 0000000");
               // alert("my array:" + myArr);
                var _SCARD_IO_REQUEST = new CONST.SCARD_IO_REQUEST;
                _SCARD_IO_REQUEST.dwProtocol = AProtocol;
                _SCARD_IO_REQUEST.cbPciLength =  CONST.SCARD_IO_REQUEST.size;  

                var command = TYPES.LPBYTE.targetType.array(myArr.length)(myArr);
                var commandLength = 21;
                //var response = TYPES.BYTE();
                var responseLength = TYPES.DWORD();

                var rez_SCT = SCardTransmit(cardHandle, _SCARD_IO_REQUEST.address(), command, commandLength, null, null, responseLength.address());
                /*if(rez_SCT.toString() == CONST.SCARD_S_SUCCESS.toString())
        console.log("SCardTransmit performed Successfully")
        else{
        console.error('cannot begin transaction, error code was: ' + rez_SCT + ' in other terms it is: 0x' + rez_SCT.toString(16) + ' you can look up this error value here: https://msdn.microsoft.com/en-us/library/windows/desktop/aa374738%28v=vs.85%29.aspx#smart_card_return_values');
        throw new Error('failed to begin transmission!');
    }*/
                var response = TYPES.LPBYTE.targetType.array(parseInt(responseLength.value))();
                var rez_SCT = SCardTransmit(cardHandle, _SCARD_IO_REQUEST.address(), command, commandLength, null, response, responseLength.address());
                var myResponse = new Array();
                for(i = 0; i < response.length; i++)
                {
                    myResponse[i] = dec2Hex(response[i]);
                }
                /*if(rez_SCT.toString() == CONST.SCARD_S_SUCCESS.toString())
                    console.log("SCardTransmit performed Successfully")
                    else{
                        console.error('cannot begin transaction, error code was: ' + rez_SCT + ' in other terms it is: 0x' + rez_SCT.toString(16) + ' you can look up this error value here: https://msdn.microsoft.com/en-us/library/windows/desktop/aa374738%28v=vs.85%29.aspx#smart_card_return_values');
                        throw new Error('failed to begin transmission!');
                    }*/
                //return myResponse;

                evt.target.setAttribute("Response",myResponse.toString());
                var doc = evt.target.ownerDocument;
                var AnswerEvt = doc.createElement("Response");
                doc.documentElement.appendChild(AnswerEvt);
                var event = doc.createEvent("HTMLEvents");
                event.initEvent("TransmitEvent",true,false);
                AnswerEvt.dispatchEvent(event);

            }
            catch(e)
            {
                //alert( "hahaha" + e.message);
            }
        }

    }


//document.addEventListener("MyExtensionEvent", function(e){myExtension.myListner(e);}, false, true);
document.addEventListener("SCardEstablishContext",function(e){myExtension1.SCardEstablishContext(e);}, false, true);
document.addEventListener("Connect",function(e){myExtension2.Connect(e);}, false, true);
document.addEventListener("Transmit",function(e){myExtension3.Transmit(e);}, false, true);

//cardLib.close();
clearHistory();


