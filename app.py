# external
import streamlit as st
import pandas as pd

# internal
import streamlit_utils
import config

def main():
    st.set_page_config(page_title="Heritage Connector Demo")
    st.markdown(streamlit_utils.load_image("header_cropped.png"), unsafe_allow_html=True)
    st.title("Heritage Connector Demo: Named Entity Recognition and Entity Linking")

    data = load_data()

    # st.write(data.head())
    categories = data['demo_category'].unique().tolist()

    chosen_category = st.selectbox("Select a category:", categories)
    category_data = data[data['demo_category'] == chosen_category]
    subcategories = ["-"] + category_data['CATEGORY1'].unique().tolist()
    chosen_subcategory = st.selectbox("Optionally select a subcategory:", subcategories, index=0)

    if chosen_subcategory != "-":
        data_use = category_data[category_data["CATEGORY1"] == chosen_subcategory]
    else:
        data_use = category_data

    category_uris = data_use['item_uri'].unique().tolist()
    page_num = st.number_input(f'[use the widget below to navigate between collection items (max {len(category_uris)})]', min_value=1, max_value=len(category_uris), value=1)

    item_data = data_use.loc[data_use['item_uri'] == category_uris[page_num]]
    item_title = item_data['TITLE'].iloc[0] if str(item_data['TITLE'].iloc[0]) != "nan" else "(no title)"
    item_uri = item_data["item_uri"].iloc[0]
    st.markdown(f"## {item_title} [↗]({item_uri})")
    st.markdown("### Named Entities")
    st.write(item_data["ent_html"].iloc[0], unsafe_allow_html=True)
    
    st.markdown("### Predicted entity links to the SMG collection")
    if st.checkbox("Show help", value=False):
        st.markdown("We predict entity links to the collection for entities which have been identified using NER with type PERSON, OBJECT or ORGANISATION as these are the record types we hold in our collection management system. **Try changing the confidence threshold using the slider below and noticing how different thresholds result in different levels of accuracy for the entity linker.**")
    
    threshold = st.slider('confidence threshold', min_value=0.1, max_value=0.8, value=0.3, step=0.05)

    for _, group in item_data.groupby("item_description_with_ent"):
        if (len(group.loc[group['y_pred'] >= threshold]) == 0) and not pd.isnull(group['candidate_rank'].iloc[0]):
            st.write((group['ent_text'].iloc[0], group['ent_label'].iloc[0]))

            st.write("No predicted links above the confidence threshold")

        elif not pd.isnull(group['candidate_rank'].iloc[0]):
            st.write((group['ent_text'].iloc[0], group['ent_label'].iloc[0]))

            st.write(group.loc[group['y_pred'] >= threshold, ['candidate_title', 'candidate_type', 'candidate_uri', 'y_pred']].sort_values('y_pred', ascending=False).to_html(escape=False, index=False), unsafe_allow_html=True)
            "---"
            
@st.cache(suppress_st_warning=True, allow_output_mutation=True)
def load_data():
    with st.spinner("Loading data..."):
        df = pd.read_pickle(config.ner_data_path)
        df['candidate_uri'] = df['candidate_uri'].apply(streamlit_utils.make_clickable)
    return df

if __name__ == "__main__":
    main()