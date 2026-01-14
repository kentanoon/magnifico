//　<script> GAS用
let customerList = [];
let currentView = 'dashboard';
let customerModalObj = null; // Bootstrap Modalインスタンス


//　初期化処理
window.onload = function() {
    // 顧客リストの取得
    google.script.run.withSuccessHandler(initCustomerSearch).getCustomerListForSearch();
    google.script.run.withSuccessHandler(renderDashboard).getDashboardData();

    // モーダルの準備
    customerModalObj = new bootstrap.Modal(document.getElementById('customerModal'));
};

function initData(data) {
    customerList = data;
    renderCustomerListTable(data); //顧客リスト画面用
    updateCustomerDatalist(data); //検索サジェスト用
}

/**
 * 画面の切り替え（ナビゲーション）
 */
function switchView(viewName) {
    // 1.全て非表示
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('projectDetailView').style.display = 'none';
    document.getElementById('customerListView').style.display = 'none';
    
    // 2.フッターアクションのリセット
    document.getElementById('action_dashboard').style.display = 'none';
    document.getElementById('action_projectDetail').style.display = 'none';

    // 3.ナビボタンのスタイルリセット
    document.querySelectorAll('.btn-nav').forEach(btn => {
        btn.classList.remove('active-nav');
        btn.classList.add('text-secondary');
        btn.classList.remove('text-primary');
    });

    // 4.指定ビューを表示　& ナビのアクティブ化
    if (viewName === 'dashboard') {
        document.getElementById('dashboardView').style.display = 'block';
        document.getElementById('action_dashboard').style.display = 'block'
        setActiveNav('nav_dash');

    } else if (viewName === 'projectDetail') {
        document.getElementById('projectDetailView').style.display = 'block';
        document.getElementById('action_projectDetail').style.display = 'block';
        setActiveNav('nav_proj');

    } else if (viewName === 'customerList') {
        document.getElementById('customerListView').style.display = 'block';
        document.getElementById('action_dashboard').style.display = 'block'; //特になし
        setActiveNav('nav_cust');
    }
    
    currentView = viewName;
    window.scrollTo(0,0); //トップへスクロール

}

/**
 * 顧客管理関連
 */
//顧客リスト描画
function renderCustomerListTable(list) {
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';

    list.forEach(cust => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${cust.name}</td>
            <td><span class="badge bg-light text-dark border">${cust.type || '_'}</span></td>
            <td>${cust.phone || ''}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" onclick="openCustomerModal('${cust.id}')">編集</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}


//　モーダルを開く　（新規 or 編集)
function openCustomerModal(custId = null) {
    const form = document.getElementById('customerForm');
    form.reset();
    
    if (custId) {
        //編集モード・既存データ読み込み
        const target = customerList.find(c => c.id === custId);
        if(target) {
            form.cust_id.value = target.id;
            form.cust_name.value = target.name;
            form.cust_phone.value = target.phone;
            form.cust_type.value = target.type;
            //target.address があればセット
        }
    } else {
        // 新規モード
        form.cust_id.value = "";
    }

    customerModalObj.show();
}

//　顧客保存実行
function submitCustomer() {
    const form = document.getElementById('customerForm');
    if(!form.cust_name.value) { alert('顧客名は必須です'); return;}

    const formData = new FormData(form);
    const dataObj = Object.fromEntries(formData.entries());

    //　GASへの送信
    google.script.run.withSuccessHandler(function(res) {
        if(res.success) {
            alert(res.message);
            customerModalObj.hide();
            // リストの再取得などの処理を入れるのが理想
            //　ここでは簡易的にローカルリストに追加して再描画
            
            if(!dataObj.cust_id) {
                customerList.push(res.savedData);
                renderCustomerListTable(customerList);
            }
        } else {
            alert(res.message);
        }
    }).saveCustomerData(dataObj);
}

//　案件画面で「顧客を変更/検索」ボタン押下した時の挙動
//　簡易的にリスト画面へ飛ばすが、本来は選択用モーダルが良い
function openCustomerSelector() {
    if(confirm('顧客リスト画面へ移動しますか？\n(入力中の案件情報はクリアされます)')) {
        switchView('customerList');
    }
}





/**
 * 顧客検索リストの生成
 */

function initCustomerSearch(data) {
    customerList = data;
    const datalist = document.getElementById('customerOptions');
    datalist.innerHTML = '';

    data.forEach(cust => {
        const option = document.createElement('option');
        option.value = cust.name + " (" + cust.id + ")";
        datalist.appendChild(option);
    });
}

/**
*顧客検索ボックスの変更検知
*/
document.getElementById('customerSearch').addEventListener('change', function(e){
    const val = e.target.value;
    const match = val.match(/\((cust_\d+)\)/);  // "顧客名 (cust_123)" から cust_123 を抽出

    if (match) {
        const custId = match[1];
        document.getElementById('hidden_cust_id').value = custId; //隠しフィールドにセット

        //サーバーへ詳細情報を取りに行く
        google.script.run.withSuccessHandler(fillheaderInfo).getCustomerDetail(custId);
    }
});

/**
 * ヘッダー情報の表示更新
 */

function fillheaderInfo(detail) {
    document.getElementById('disp_custId').textContent = detail.id;
    document.getElementById('disp_phone').textContent = "03-xxxx-xxxx"; // デモ用の電話番号
    document.getElementById('disp_rank').textContent = detail.rank;
    document.getElementById('disp_address').textContent = detail.address;

    //データオブジェクトを一時保存（コピー機能などで利用するため)
    window.currentCustomer = detail;
}

/** 
 * 住所コピー機能
 */
function copyAddress() {
    if (window.currentCustomer && window.currentCustomer.address) {
        document.getElementById('site_address').value = window.currentCustomer.address;
    } else {
        alert('先に顧客を選択してください');
    }
}

/**
 * 日付自動計算
 */
function autoCalcSchedule() {
    const contractInput = document.querySelector('input[name="contract_date"]');
    if (!contractInput.value) {
        alert('「基本・契約」タブで契約日を入力してください。');
        return;
    }

    const contractDate = new Date(contractInput.value);

    // 着工　＝　契約　＋　30日
    const startDate = new Date(contractDate);
    startDate.setDate(startDate.getDate() + 30);
    document.getElementById('start_plan').valueAsDate = startDate;
    
    // 完了　＝　契約　＋　120日
    const endDate = new Date(contractDate);
    endDate.setDate(endDate.getDate() + 120);
    document.getElementById('end_plan').valueAsDate = endDate;
    
    alert('契約日を基準に、着工・完了予定日を仮入力しました。');
}

/**
 * リセット処理
 */
function resetForm() {
    if(confirm('入力をクリアしますか？')) {
        document.getElementById('mainForm').reset();
    }
}

/**
 * 保存ボタン押下時の処理
 */
function submitData() {
    const form =document.getElementById('mainForm');

    // HTML5の標準検証機能
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // フォームデータをオブジェクト形式に変換
    const formData = new FormData(form);
    const dataObj = {};
    formData.forEach((value, key) => {
        dataObj[key] = value;
    });

    // ボタンを無効化
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 保存中...';
    
    // GASサーバーへ送信
    google.script.run
        .withSuccessHandler(function(response) {
            if (response.success) {
                document.getElementById('statusMessage').textContent = response.message;
                setTimeout(() => { document.getElementById('statusMessage').textContent = ''; } ,3000);
            } else {
                alert('エラー: ' + response.message);
            }
            btn.disabled  = false;
            btn.innerHTML = originalText;
        })
        .withFailureHandler(function(error) {
            alert('通信エラー: ' + error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        })
        .saveProjectData(dataObj);
}