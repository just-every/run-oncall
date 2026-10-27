import {useState} from 'react';
import type {ServicePageProps} from './ServicePage';
import {ServicePage} from './ServicePage';
import {ServiceList} from './ServiceList';

type Props = Omit<ServicePageProps, 'service'> & {selected: string; open: (path: string) => void};
export function ServicesHome({selected, open, ...props}: Props) {
  const [created, setCreated] = useState('');
  const service = props.state.services.find(value => value.id === selected);
  return <div className={'services-workspace' + (service ? ' with-service' : '')}>
    <ServiceList state={props.state} admin={props.admin} busy={props.busy} selected={selected} command={props.command} open={path => {setCreated(decodeURIComponent(path.split('/').at(-1)!));open(path);}}/>
    {service && <ServicePage key={service.id} service={service} {...props} focusName={created === selected}/>}
    {selected && !service && <section className="panel padded"><h2>Service not found</h2><a href="/settings/services">Back to Services</a></section>}
  </div>;
}
