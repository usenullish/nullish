-- Seed the "llc" (GmbH/Sàrl) and "corporation" (AG/SA) ledger_accounts templates from bexio's
-- "PLAN COMPTABLE SA/SÀRL PETIT" reference chart of accounts, the same chart for both legal forms.
-- Source: https://cdn.bexio.com/support/kontenplan_import_templates/bexio_coa_ag_small_french.pdf
DO $$
DECLARE
v_legal_form core.legal_form;
v_raw jsonb := (
        '[' ||
        -- Classe 1: Actifs
        '{"code":"1","parent_code":null,"type":"asset"},' ||
        '{"code":"10","parent_code":"1","type":"asset"},' ||
        '{"code":"100","parent_code":"10","type":"asset"},' ||
        '{"code":"1020","parent_code":"100","type":"asset","purpose":"bank_account"},' ||
        '{"code":"109","parent_code":"10","type":"asset"},' ||
        '{"code":"1090","parent_code":"109","type":"asset"},' ||
        '{"code":"1091","parent_code":"109","type":"asset"},' ||
        '{"code":"1099","parent_code":"109","type":"asset"},' ||
        '{"code":"110","parent_code":"10","type":"asset"},' ||
        '{"code":"1100","parent_code":"110","type":"asset","purpose":"debtor"},' ||
        '{"code":"1109","parent_code":"110","type":"asset"},' ||
        '{"code":"1130","parent_code":"110","type":"asset"},' ||
        '{"code":"114","parent_code":"10","type":"asset"},' ||
        '{"code":"1140","parent_code":"114","type":"asset"},' ||
        '{"code":"117","parent_code":"10","type":"asset"},' ||
        '{"code":"1170","parent_code":"117","type":"asset","purpose":"tax_pre_material"},' ||
        '{"code":"1171","parent_code":"117","type":"asset","purpose":"tax_pre_investment"},' ||
        '{"code":"1172","parent_code":"117","type":"asset","purpose":"transitory_tax_account_pre"},' ||
        '{"code":"1173","parent_code":"117","type":"asset","purpose":"tax_pre_tax_cuts"},' ||
        '{"code":"1174","parent_code":"117","type":"asset","purpose":"tax_pre_tax_correction"},' ||
        '{"code":"1175","parent_code":"117","type":"asset"},' ||
        '{"code":"1176","parent_code":"117","type":"asset"},' ||
        '{"code":"118","parent_code":"10","type":"asset"},' ||
        '{"code":"1183","parent_code":"118","type":"asset"},' ||
        '{"code":"1184","parent_code":"118","type":"asset"},' ||
        '{"code":"1188","parent_code":"118","type":"asset"},' ||
        '{"code":"120","parent_code":"10","type":"asset"},' ||
        '{"code":"1200","parent_code":"120","type":"asset"},' ||
        '{"code":"1280","parent_code":"120","type":"asset"},' ||
        '{"code":"130","parent_code":"10","type":"asset"},' ||
        '{"code":"1300","parent_code":"130","type":"asset"},' ||
        '{"code":"14","parent_code":"1","type":"asset"},' ||
        '{"code":"150","parent_code":"14","type":"asset"},' ||
        '{"code":"1500","parent_code":"150","type":"asset"},' ||
        '{"code":"1510","parent_code":"150","type":"asset"},' ||
        '{"code":"1520","parent_code":"150","type":"asset"},' ||
        '{"code":"1530","parent_code":"150","type":"asset"},' ||

        -- Classe 2: Passifs
        '{"code":"2","parent_code":null,"type":"liability"},' ||
        '{"code":"20","parent_code":"2","type":"liability"},' ||
        '{"code":"200","parent_code":"20","type":"liability"},' ||
        '{"code":"2000","parent_code":"200","type":"liability"},' ||
        '{"code":"2030","parent_code":"200","type":"liability","purpose":"customer_credit_balance"},' ||
        '{"code":"210","parent_code":"20","type":"liability"},' ||
        '{"code":"2100","parent_code":"210","type":"liability"},' ||
        '{"code":"2190","parent_code":"210","type":"liability"},' ||
        '{"code":"220","parent_code":"20","type":"liability"},' ||
        '{"code":"2200","parent_code":"220","type":"liability","purpose":"vat_tax_due"},' ||
        '{"code":"2201","parent_code":"220","type":"liability","purpose":"settlement_account_vat"},' ||
        '{"code":"2202","parent_code":"220","type":"liability","purpose":"vat_remuneration_received"},' ||
        '{"code":"2203","parent_code":"220","type":"liability","purpose":"regards_tax"},' ||
        '{"code":"227","parent_code":"20","type":"liability"},' ||
        '{"code":"2270","parent_code":"227","type":"liability"},' ||
        '{"code":"2271","parent_code":"227","type":"liability"},' ||
        '{"code":"2272","parent_code":"227","type":"liability"},' ||
        '{"code":"2273","parent_code":"227","type":"liability"},' ||
        '{"code":"2274","parent_code":"227","type":"liability"},' ||
        '{"code":"2279","parent_code":"227","type":"liability"},' ||
        '{"code":"230","parent_code":"20","type":"liability"},' ||
        '{"code":"2300","parent_code":"230","type":"liability","purpose":"creditor"},' ||
        '{"code":"24","parent_code":"2","type":"liability"},' ||
        '{"code":"240","parent_code":"24","type":"liability"},' ||
        '{"code":"2400","parent_code":"240","type":"liability"},' ||
        '{"code":"2560","parent_code":"24","type":"liability"},' ||
        '{"code":"28","parent_code":"2","type":"equity"},' ||
        '{"code":"280","parent_code":"28","type":"equity"},' ||
        '{"code":"2800","parent_code":"280","type":"equity","purpose":"capital"},' ||
        '{"code":"290","parent_code":"28","type":"equity"},' ||
        '{"code":"2950","parent_code":"290","type":"equity"},' ||
        '{"code":"2970","parent_code":"290","type":"equity"},' ||
        '{"code":"2979","parent_code":"290","type":"equity","purpose":"annual_result"},' ||

        -- Classe 3: Produits nets des ventes de biens et de prestations de services
        '{"code":"3","parent_code":null,"type":"income"},' ||
        '{"code":"30","parent_code":"3","type":"income"},' ||
        '{"code":"300","parent_code":"30","type":"income"},' ||
        '{"code":"3000","parent_code":"300","type":"income"},' ||
        '{"code":"32","parent_code":"3","type":"income"},' ||
        '{"code":"320","parent_code":"32","type":"income"},' ||
        '{"code":"3200","parent_code":"320","type":"income"},' ||
        '{"code":"34","parent_code":"3","type":"income"},' ||
        '{"code":"340","parent_code":"34","type":"income"},' ||
        '{"code":"3400","parent_code":"340","type":"income","purpose":"default_income"},' ||
        '{"code":"36","parent_code":"3","type":"income"},' ||
        '{"code":"360","parent_code":"36","type":"income"},' ||
        '{"code":"3600","parent_code":"360","type":"income"},' ||
        '{"code":"368","parent_code":"36","type":"income"},' ||
        '{"code":"3680","parent_code":"368","type":"income"},' ||
        '{"code":"38","parent_code":"3","type":"income"},' ||
        '{"code":"380","parent_code":"38","type":"income"},' ||
        '{"code":"3800","parent_code":"380","type":"income","purpose":"income_reduction"},' ||
        '{"code":"3801","parent_code":"380","type":"income"},' ||
        '{"code":"3802","parent_code":"380","type":"income"},' ||
        '{"code":"3803","parent_code":"380","type":"income"},' ||
        '{"code":"3804","parent_code":"380","type":"income"},' ||
        '{"code":"3805","parent_code":"380","type":"income","purpose":"bad_debts"},' ||
        '{"code":"3806","parent_code":"380","type":"income"},' ||
        '{"code":"39","parent_code":"3","type":"income"},' ||
        '{"code":"394","parent_code":"39","type":"income"},' ||
        '{"code":"3940","parent_code":"394","type":"income"},' ||

        -- Classe 4: Charges de matériel, de marchandises et des prestations
        '{"code":"4","parent_code":null,"type":"expense"},' ||
        '{"code":"40","parent_code":"4","type":"expense"},' ||
        '{"code":"400","parent_code":"40","type":"expense"},' ||
        '{"code":"4000","parent_code":"400","type":"expense"},' ||
        '{"code":"42","parent_code":"4","type":"expense"},' ||
        '{"code":"420","parent_code":"42","type":"expense"},' ||
        '{"code":"4200","parent_code":"420","type":"expense","purpose":"default_expense"},' ||
        '{"code":"4208","parent_code":"420","type":"expense"},' ||
        '{"code":"427","parent_code":"4","type":"expense"},' ||
        '{"code":"4270","parent_code":"427","type":"expense"},' ||
        '{"code":"44","parent_code":"4","type":"expense"},' ||
        '{"code":"440","parent_code":"44","type":"expense"},' ||
        '{"code":"4400","parent_code":"440","type":"expense"},' ||
        '{"code":"46","parent_code":"4","type":"expense"},' ||
        '{"code":"462","parent_code":"46","type":"expense"},' ||
        '{"code":"4620","parent_code":"462","type":"expense"},' ||
        '{"code":"464","parent_code":"46","type":"expense"},' ||
        '{"code":"4640","parent_code":"464","type":"expense"},' ||
        '{"code":"465","parent_code":"46","type":"expense"},' ||
        '{"code":"4650","parent_code":"465","type":"expense"},' ||
        '{"code":"466","parent_code":"46","type":"expense"},' ||
        '{"code":"4660","parent_code":"466","type":"expense"},' ||
        '{"code":"47","parent_code":"4","type":"expense"},' ||
        '{"code":"4700","parent_code":"47","type":"expense"},' ||
        '{"code":"48","parent_code":"4","type":"expense"},' ||
        '{"code":"480","parent_code":"48","type":"expense"},' ||
        '{"code":"4800","parent_code":"480","type":"expense"},' ||
        '{"code":"49","parent_code":"4","type":"expense"},' ||
        '{"code":"490","parent_code":"49","type":"expense"},' ||
        '{"code":"4900","parent_code":"490","type":"expense","purpose":"expense_reduction"},' ||
        '{"code":"4901","parent_code":"490","type":"expense"},' ||
        '{"code":"4906","parent_code":"490","type":"expense"},' ||

        -- Classe 5: Charges de personnel
        '{"code":"5","parent_code":null,"type":"expense"},' ||
        '{"code":"50","parent_code":"5","type":"expense"},' ||
        '{"code":"500","parent_code":"50","type":"expense"},' ||
        '{"code":"5000","parent_code":"500","type":"expense"},' ||
        '{"code":"5001","parent_code":"500","type":"expense"},' ||
        '{"code":"5002","parent_code":"500","type":"expense"},' ||
        '{"code":"5003","parent_code":"500","type":"expense"},' ||
        '{"code":"5005","parent_code":"500","type":"expense"},' ||
        '{"code":"5008","parent_code":"500","type":"expense"},' ||
        '{"code":"57","parent_code":"5","type":"expense"},' ||
        '{"code":"570","parent_code":"57","type":"expense"},' ||
        '{"code":"5700","parent_code":"570","type":"expense"},' ||
        '{"code":"5710","parent_code":"570","type":"expense"},' ||
        '{"code":"5720","parent_code":"570","type":"expense"},' ||
        '{"code":"5730","parent_code":"570","type":"expense"},' ||
        '{"code":"5740","parent_code":"570","type":"expense"},' ||
        '{"code":"5790","parent_code":"570","type":"expense"},' ||
        '{"code":"58","parent_code":"5","type":"expense"},' ||
        '{"code":"581","parent_code":"58","type":"expense"},' ||
        '{"code":"5810","parent_code":"581","type":"expense"},' ||
        '{"code":"582","parent_code":"58","type":"expense"},' ||
        '{"code":"5820","parent_code":"582","type":"expense"},' ||
        '{"code":"583","parent_code":"58","type":"expense"},' ||
        '{"code":"5832","parent_code":"583","type":"expense"},' ||
        '{"code":"588","parent_code":"58","type":"expense"},' ||
        '{"code":"5880","parent_code":"588","type":"expense"},' ||
        '{"code":"589","parent_code":"58","type":"expense"},' ||
        '{"code":"5890","parent_code":"589","type":"expense"},' ||
        '{"code":"5891","parent_code":"589","type":"expense"},' ||

        -- Classe 6: Autres charges d'exploitation
        '{"code":"6","parent_code":null,"type":"expense"},' ||
        '{"code":"60","parent_code":"6","type":"expense"},' ||
        '{"code":"600","parent_code":"60","type":"expense"},' ||
        '{"code":"6000","parent_code":"600","type":"expense"},' ||
        '{"code":"603","parent_code":"60","type":"expense"},' ||
        '{"code":"6030","parent_code":"603","type":"expense"},' ||
        '{"code":"6040","parent_code":"603","type":"expense"},' ||
        '{"code":"61","parent_code":"6","type":"expense"},' ||
        '{"code":"610","parent_code":"61","type":"expense"},' ||
        '{"code":"6100","parent_code":"610","type":"expense"},' ||
        '{"code":"62","parent_code":"6","type":"expense"},' ||
        '{"code":"620","parent_code":"62","type":"expense"},' ||
        '{"code":"6200","parent_code":"620","type":"expense"},' ||
        '{"code":"6210","parent_code":"620","type":"expense"},' ||
        '{"code":"6220","parent_code":"620","type":"expense"},' ||
        '{"code":"6260","parent_code":"620","type":"expense"},' ||
        '{"code":"6270","parent_code":"620","type":"expense"},' ||
        '{"code":"63","parent_code":"6","type":"expense"},' ||
        '{"code":"630","parent_code":"63","type":"expense"},' ||
        '{"code":"6300","parent_code":"630","type":"expense"},' ||
        '{"code":"636","parent_code":"63","type":"expense"},' ||
        '{"code":"6360","parent_code":"636","type":"expense"},' ||
        '{"code":"64","parent_code":"6","type":"expense"},' ||
        '{"code":"640","parent_code":"64","type":"expense"},' ||
        '{"code":"6400","parent_code":"640","type":"expense"},' ||
        '{"code":"65","parent_code":"6","type":"expense"},' ||
        '{"code":"650","parent_code":"65","type":"expense"},' ||
        '{"code":"6500","parent_code":"650","type":"expense"},' ||
        '{"code":"6510","parent_code":"650","type":"expense"},' ||
        '{"code":"6512","parent_code":"650","type":"expense"},' ||
        '{"code":"6513","parent_code":"650","type":"expense"},' ||
        '{"code":"6530","parent_code":"650","type":"expense"},' ||
        '{"code":"6559","parent_code":"650","type":"expense"},' ||
        '{"code":"657","parent_code":"65","type":"expense"},' ||
        '{"code":"6570","parent_code":"657","type":"expense"},' ||
        '{"code":"66","parent_code":"6","type":"expense"},' ||
        '{"code":"660","parent_code":"66","type":"expense"},' ||
        '{"code":"6600","parent_code":"660","type":"expense"},' ||
        '{"code":"664","parent_code":"66","type":"expense"},' ||
        '{"code":"6640","parent_code":"664","type":"expense"},' ||
        '{"code":"6641","parent_code":"664","type":"expense"},' ||
        '{"code":"68","parent_code":"6","type":"expense"},' ||
        '{"code":"680","parent_code":"68","type":"expense"},' ||
        '{"code":"6800","parent_code":"680","type":"expense"},' ||
        '{"code":"69","parent_code":"6","type":"expense"},' ||
        '{"code":"690","parent_code":"69","type":"expense"},' ||
        '{"code":"6900","parent_code":"690","type":"expense"},' ||
        '{"code":"6940","parent_code":"690","type":"expense"},' ||
        '{"code":"6945","parent_code":"690","type":"expense","purpose":"rounding_differences"},' ||
        '{"code":"6949","parent_code":"690","type":"expense","purpose":"exchange_rate_losses"},' ||
        '{"code":"695","parent_code":"69","type":"income"},' ||
        '{"code":"6950","parent_code":"695","type":"income"},' ||
        '{"code":"6999","parent_code":"695","type":"income","purpose":"exchange_rate_gains"},' ||

        -- Classe 8: Résultats exceptionnels et hors exploitation
        '{"code":"8","parent_code":null,"type":"expense"},' ||
        '{"code":"80","parent_code":"8","type":"expense"},' ||
        '{"code":"8000","parent_code":"80","type":"expense"},' ||
        '{"code":"8100","parent_code":"80","type":"income"},' ||
        '{"code":"85","parent_code":"8","type":"expense"},' ||
        '{"code":"8505","parent_code":"85","type":"expense"},' ||
        '{"code":"8514","parent_code":"85","type":"income"},' ||
        '{"code":"89","parent_code":"8","type":"expense"},' ||
        '{"code":"8900","parent_code":"89","type":"expense"},' ||

        -- Classe 9: Clôture
        '{"code":"9","parent_code":null,"type":"closing"},' ||
        '{"code":"91","parent_code":"9","type":"closing"},' ||
        '{"code":"9000","parent_code":"91","type":"closing","purpose":"profit_and_loss"},' ||
        '{"code":"9100","parent_code":"91","type":"closing","purpose":"opening_balance_sheet"},' ||
        '{"code":"9101","parent_code":"91","type":"closing","purpose":"closing_balance_sheet"},' ||
        '{"code":"9200","parent_code":"91","type":"closing","purpose":"annual_profit"},' ||
        '{"code":"9900","parent_code":"91","type":"closing","purpose":"correction"},' ||
        '{"code":"9901","parent_code":"9900","type":"closing","purpose":"balance_takeover"}' ||
        ']'
    )::jsonb;
BEGIN
FOREACH v_legal_form IN ARRAY ARRAY['llc', 'corporation']::core.legal_form[]
LOOP
    -- Loop 1: insert every row from v_raw, no parent yet.
INSERT INTO templates.ledger_accounts (id, legal_form, code, type, purpose)
SELECT gen_random_uuid(), v_legal_form, x.code, x.type::ledger.account_type, x.purpose::ledger.system_account_purpose
FROM jsonb_to_recordset(v_raw) AS x(code text, parent_code text, type text, purpose text);

-- Loop 2: resolve and set parent_id, now that all rows exist.
UPDATE templates.ledger_accounts a
SET parent_id = p.id
    FROM jsonb_to_recordset(v_raw) AS x(code text, parent_code text, type text)
    JOIN templates.ledger_accounts p
ON p.code = x.parent_code
    AND p.legal_form = v_legal_form
WHERE a.code = x.code
  AND a.legal_form = v_legal_form
  AND x.parent_code IS NOT NULL;
END LOOP;
END;
$$;

-- Seed the "sole_proprietorship" (Einzelunternehmen/Entreprise individuelle) ledger_accounts template
-- from bexio's "CHART OF ACCOUNTS SOLE PROPRIETORSHIP" reference chart of accounts.
-- Source: https://cdn.bexio.com/support/kontenplan_import_templates/bexio_coa_solo_english.pdf
DO $$
DECLARE
v_raw jsonb := (
        '[' ||
        -- Class 1: Assets
        '{"code":"1","parent_code":null,"type":"asset"},' ||
        '{"code":"10","parent_code":"1","type":"asset"},' ||
        '{"code":"100","parent_code":"10","type":"asset"},' ||
        '{"code":"1020","parent_code":"100","type":"asset","purpose":"bank_account"},' ||
        '{"code":"109","parent_code":"10","type":"asset"},' ||
        '{"code":"1090","parent_code":"109","type":"asset"},' ||
        '{"code":"1091","parent_code":"109","type":"asset"},' ||
        '{"code":"110","parent_code":"10","type":"asset"},' ||
        '{"code":"1100","parent_code":"110","type":"asset","purpose":"debtor"},' ||
        '{"code":"1109","parent_code":"110","type":"asset"},' ||
        '{"code":"1130","parent_code":"110","type":"asset"},' ||
        '{"code":"117","parent_code":"10","type":"asset"},' ||
        '{"code":"1170","parent_code":"117","type":"asset","purpose":"tax_pre_material"},' ||
        '{"code":"1171","parent_code":"117","type":"asset","purpose":"tax_pre_investment"},' ||
        '{"code":"1172","parent_code":"117","type":"asset","purpose":"transitory_tax_account_pre"},' ||
        '{"code":"1173","parent_code":"117","type":"asset","purpose":"tax_pre_tax_cuts"},' ||
        '{"code":"1174","parent_code":"117","type":"asset","purpose":"tax_pre_tax_correction"},' ||
        '{"code":"1175","parent_code":"117","type":"asset"},' ||
        '{"code":"1176","parent_code":"117","type":"asset"},' ||
        '{"code":"118","parent_code":"10","type":"asset"},' ||
        '{"code":"1183","parent_code":"118","type":"asset"},' ||
        '{"code":"1184","parent_code":"118","type":"asset"},' ||
        '{"code":"1188","parent_code":"118","type":"asset"},' ||
        '{"code":"120","parent_code":"10","type":"asset"},' ||
        '{"code":"1200","parent_code":"120","type":"asset"},' ||
        '{"code":"1280","parent_code":"120","type":"asset"},' ||
        '{"code":"130","parent_code":"10","type":"asset"},' ||
        '{"code":"1300","parent_code":"130","type":"asset"},' ||
        '{"code":"14","parent_code":"1","type":"asset"},' ||
        '{"code":"150","parent_code":"14","type":"asset"},' ||
        '{"code":"1500","parent_code":"150","type":"asset"},' ||
        '{"code":"1510","parent_code":"150","type":"asset"},' ||
        '{"code":"1520","parent_code":"150","type":"asset"},' ||
        '{"code":"1530","parent_code":"150","type":"asset"},' ||

        -- Class 2: Liabilities
        '{"code":"2","parent_code":null,"type":"liability"},' ||
        '{"code":"20","parent_code":"2","type":"liability"},' ||
        '{"code":"200","parent_code":"20","type":"liability"},' ||
        '{"code":"2000","parent_code":"200","type":"liability"},' ||
        '{"code":"2030","parent_code":"200","type":"liability","purpose":"customer_credit_balance"},' ||
        '{"code":"210","parent_code":"20","type":"liability"},' ||
        '{"code":"2190","parent_code":"210","type":"liability"},' ||
        '{"code":"220","parent_code":"20","type":"liability"},' ||
        '{"code":"2200","parent_code":"220","type":"liability","purpose":"vat_tax_due"},' ||
        '{"code":"2201","parent_code":"220","type":"liability","purpose":"settlement_account_vat"},' ||
        '{"code":"2202","parent_code":"220","type":"liability","purpose":"vat_remuneration_received"},' ||
        '{"code":"2203","parent_code":"220","type":"liability","purpose":"regards_tax"},' ||
        '{"code":"227","parent_code":"20","type":"liability"},' ||
        '{"code":"2270","parent_code":"227","type":"liability"},' ||
        '{"code":"2271","parent_code":"227","type":"liability"},' ||
        '{"code":"2272","parent_code":"227","type":"liability"},' ||
        '{"code":"2273","parent_code":"227","type":"liability"},' ||
        '{"code":"2274","parent_code":"227","type":"liability"},' ||
        '{"code":"2279","parent_code":"227","type":"liability"},' ||
        '{"code":"230","parent_code":"20","type":"liability"},' ||
        '{"code":"2300","parent_code":"230","type":"liability","purpose":"creditor"},' ||
        '{"code":"24","parent_code":"2","type":"liability"},' ||
        '{"code":"240","parent_code":"24","type":"liability"},' ||
        '{"code":"2400","parent_code":"240","type":"liability"},' ||
        '{"code":"28","parent_code":"2","type":"equity"},' ||
        '{"code":"280","parent_code":"28","type":"equity"},' ||
        '{"code":"2800","parent_code":"280","type":"equity","purpose":"capital"},' ||
        '{"code":"282","parent_code":"28","type":"equity"},' ||
        '{"code":"2820","parent_code":"282","type":"equity","purpose":"capital_contributions"},' ||
        '{"code":"285","parent_code":"28","type":"equity"},' ||
        '{"code":"2850","parent_code":"285","type":"equity","purpose":"private_account"},' ||
        '{"code":"289","parent_code":"28","type":"equity"},' ||
        '{"code":"2891","parent_code":"289","type":"equity","purpose":"annual_result"},' ||

        -- Class 3: Net revenues
        '{"code":"3","parent_code":null,"type":"income"},' ||
        '{"code":"32","parent_code":"3","type":"income"},' ||
        '{"code":"320","parent_code":"32","type":"income"},' ||
        '{"code":"3200","parent_code":"320","type":"income"},' ||
        '{"code":"34","parent_code":"3","type":"income"},' ||
        '{"code":"340","parent_code":"34","type":"income"},' ||
        '{"code":"3400","parent_code":"340","type":"income","purpose":"default_income"},' ||
        '{"code":"36","parent_code":"3","type":"income"},' ||
        '{"code":"360","parent_code":"36","type":"income"},' ||
        '{"code":"3600","parent_code":"360","type":"income"},' ||
        '{"code":"38","parent_code":"3","type":"income"},' ||
        '{"code":"380","parent_code":"38","type":"income"},' ||
        '{"code":"3800","parent_code":"380","type":"income","purpose":"income_reduction"},' ||
        '{"code":"3805","parent_code":"380","type":"income","purpose":"bad_debts"},' ||
        '{"code":"3806","parent_code":"380","type":"income"},' ||
        '{"code":"39","parent_code":"3","type":"income"},' ||
        '{"code":"394","parent_code":"39","type":"income"},' ||
        '{"code":"3940","parent_code":"394","type":"income"},' ||

        -- Class 4: Cost for material, goods, services and energy
        '{"code":"4","parent_code":null,"type":"expense"},' ||
        '{"code":"40","parent_code":"4","type":"expense"},' ||
        '{"code":"400","parent_code":"40","type":"expense"},' ||
        '{"code":"4000","parent_code":"400","type":"expense"},' ||
        '{"code":"42","parent_code":"4","type":"expense"},' ||
        '{"code":"420","parent_code":"42","type":"expense"},' ||
        '{"code":"4200","parent_code":"420","type":"expense","purpose":"default_expense"},' ||
        '{"code":"44","parent_code":"4","type":"expense"},' ||
        '{"code":"440","parent_code":"44","type":"expense"},' ||
        '{"code":"4400","parent_code":"440","type":"expense"},' ||
        '{"code":"49","parent_code":"4","type":"expense"},' ||
        '{"code":"490","parent_code":"49","type":"expense"},' ||
        '{"code":"4900","parent_code":"490","type":"expense","purpose":"expense_reduction"},' ||
        '{"code":"4906","parent_code":"490","type":"expense"},' ||

        -- Class 5: Personnel expenses
        '{"code":"5","parent_code":null,"type":"expense"},' ||
        '{"code":"50","parent_code":"5","type":"expense"},' ||
        '{"code":"500","parent_code":"50","type":"expense"},' ||
        '{"code":"5000","parent_code":"500","type":"expense"},' ||
        '{"code":"5001","parent_code":"500","type":"expense"},' ||
        '{"code":"5002","parent_code":"500","type":"expense"},' ||
        '{"code":"5003","parent_code":"500","type":"expense"},' ||
        '{"code":"5005","parent_code":"500","type":"expense"},' ||
        '{"code":"5008","parent_code":"500","type":"expense"},' ||
        '{"code":"57","parent_code":"5","type":"expense"},' ||
        '{"code":"570","parent_code":"57","type":"expense"},' ||
        '{"code":"5700","parent_code":"570","type":"expense"},' ||
        '{"code":"5710","parent_code":"570","type":"expense"},' ||
        '{"code":"5720","parent_code":"570","type":"expense"},' ||
        '{"code":"5730","parent_code":"570","type":"expense"},' ||
        '{"code":"5740","parent_code":"570","type":"expense"},' ||
        '{"code":"5790","parent_code":"570","type":"expense"},' ||
        '{"code":"58","parent_code":"5","type":"expense"},' ||
        '{"code":"581","parent_code":"58","type":"expense"},' ||
        '{"code":"5810","parent_code":"581","type":"expense"},' ||
        '{"code":"582","parent_code":"58","type":"expense"},' ||
        '{"code":"5820","parent_code":"582","type":"expense"},' ||
        '{"code":"583","parent_code":"58","type":"expense"},' ||
        '{"code":"5832","parent_code":"583","type":"expense"},' ||
        '{"code":"588","parent_code":"58","type":"expense"},' ||
        '{"code":"5880","parent_code":"588","type":"expense"},' ||
        '{"code":"589","parent_code":"58","type":"expense"},' ||
        '{"code":"5890","parent_code":"589","type":"expense"},' ||
        '{"code":"5891","parent_code":"589","type":"expense"},' ||

        -- Class 6: Operating expenses
        '{"code":"6","parent_code":null,"type":"expense"},' ||
        '{"code":"60","parent_code":"6","type":"expense"},' ||
        '{"code":"600","parent_code":"60","type":"expense"},' ||
        '{"code":"6000","parent_code":"600","type":"expense"},' ||
        '{"code":"6040","parent_code":"600","type":"expense"},' ||
        '{"code":"61","parent_code":"6","type":"expense"},' ||
        '{"code":"610","parent_code":"61","type":"expense"},' ||
        '{"code":"6100","parent_code":"610","type":"expense"},' ||
        '{"code":"62","parent_code":"6","type":"expense"},' ||
        '{"code":"620","parent_code":"62","type":"expense"},' ||
        '{"code":"6200","parent_code":"620","type":"expense"},' ||
        '{"code":"6210","parent_code":"620","type":"expense"},' ||
        '{"code":"6220","parent_code":"620","type":"expense"},' ||
        '{"code":"6260","parent_code":"620","type":"expense"},' ||
        '{"code":"6270","parent_code":"620","type":"expense"},' ||
        '{"code":"63","parent_code":"6","type":"expense"},' ||
        '{"code":"630","parent_code":"63","type":"expense"},' ||
        '{"code":"6300","parent_code":"630","type":"expense"},' ||
        '{"code":"636","parent_code":"63","type":"expense"},' ||
        '{"code":"6360","parent_code":"636","type":"expense"},' ||
        '{"code":"64","parent_code":"6","type":"expense"},' ||
        '{"code":"640","parent_code":"64","type":"expense"},' ||
        '{"code":"6400","parent_code":"640","type":"expense"},' ||
        '{"code":"65","parent_code":"6","type":"expense"},' ||
        '{"code":"650","parent_code":"65","type":"expense"},' ||
        '{"code":"6500","parent_code":"650","type":"expense"},' ||
        '{"code":"6510","parent_code":"650","type":"expense"},' ||
        '{"code":"6512","parent_code":"650","type":"expense"},' ||
        '{"code":"6513","parent_code":"650","type":"expense"},' ||
        '{"code":"6530","parent_code":"650","type":"expense"},' ||
        '{"code":"6559","parent_code":"650","type":"expense"},' ||
        '{"code":"657","parent_code":"65","type":"expense"},' ||
        '{"code":"6570","parent_code":"657","type":"expense"},' ||
        '{"code":"66","parent_code":"6","type":"expense"},' ||
        '{"code":"660","parent_code":"66","type":"expense"},' ||
        '{"code":"6600","parent_code":"660","type":"expense"},' ||
        '{"code":"664","parent_code":"66","type":"expense"},' ||
        '{"code":"6640","parent_code":"664","type":"expense"},' ||
        '{"code":"6641","parent_code":"664","type":"expense"},' ||
        '{"code":"68","parent_code":"6","type":"expense"},' ||
        '{"code":"680","parent_code":"68","type":"expense"},' ||
        '{"code":"6800","parent_code":"680","type":"expense"},' ||
        '{"code":"69","parent_code":"6","type":"expense"},' ||
        '{"code":"690","parent_code":"69","type":"expense"},' ||
        '{"code":"6900","parent_code":"690","type":"expense"},' ||
        '{"code":"6940","parent_code":"690","type":"expense"},' ||
        '{"code":"6945","parent_code":"690","type":"expense","purpose":"rounding_differences"},' ||
        '{"code":"6949","parent_code":"690","type":"expense","purpose":"exchange_rate_losses"},' ||
        '{"code":"695","parent_code":"69","type":"income"},' ||
        '{"code":"6950","parent_code":"695","type":"income"},' ||
        '{"code":"6999","parent_code":"695","type":"income","purpose":"exchange_rate_gains"},' ||

        -- Class 8: Extraordinary expenditures / income
        '{"code":"8","parent_code":null,"type":"expense"},' ||
        '{"code":"80","parent_code":"8","type":"expense"},' ||
        '{"code":"8000","parent_code":"80","type":"expense"},' ||
        '{"code":"8100","parent_code":"80","type":"income"},' ||
        '{"code":"85","parent_code":"8","type":"expense"},' ||
        '{"code":"8505","parent_code":"85","type":"expense"},' ||
        '{"code":"8514","parent_code":"85","type":"income"},' ||

        -- Class 9: Closing
        '{"code":"9","parent_code":null,"type":"closing"},' ||
        '{"code":"91","parent_code":"9","type":"closing"},' ||
        '{"code":"9000","parent_code":"91","type":"closing","purpose":"profit_and_loss"},' ||
        '{"code":"9100","parent_code":"91","type":"closing","purpose":"opening_balance_sheet"},' ||
        '{"code":"9101","parent_code":"91","type":"closing","purpose":"closing_balance_sheet"},' ||
        '{"code":"9200","parent_code":"91","type":"closing","purpose":"annual_profit"},' ||
        '{"code":"9900","parent_code":"91","type":"closing","purpose":"correction"},' ||
        '{"code":"9901","parent_code":"9900","type":"closing","purpose":"balance_takeover"}' ||
        ']'
    )::jsonb;
BEGIN
    -- Loop 1: insert every row from v_raw, no parent yet.
INSERT INTO templates.ledger_accounts (id, legal_form, code, type, purpose)
SELECT gen_random_uuid(), 'sole_proprietorship', x.code, x.type::ledger.account_type, x.purpose::ledger.system_account_purpose
FROM jsonb_to_recordset(v_raw) AS x(code text, parent_code text, type text, purpose text);

-- Loop 2: resolve and set parent_id, now that all rows exist.
UPDATE templates.ledger_accounts a
SET parent_id = p.id
    FROM jsonb_to_recordset(v_raw) AS x(code text, parent_code text, type text)
    JOIN templates.ledger_accounts p
ON p.code = x.parent_code
    AND p.legal_form = 'sole_proprietorship'
WHERE a.code = x.code
  AND a.legal_form = 'sole_proprietorship'
  AND x.parent_code IS NOT NULL;
END;
$$;
